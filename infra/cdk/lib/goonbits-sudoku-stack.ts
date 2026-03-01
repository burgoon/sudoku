import path from "path";
import { fileURLToPath } from "url";
import { Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class GoonbitsSudokuStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.join(__dirname, "..", "..", "..");

    /* ---------- Optional custom domain ---------- */

    const customDomain = this.node.tryGetContext("domainName") as string | undefined;
    const certArn = this.node.tryGetContext("certificateArn") as string | undefined;

    const certificate =
      customDomain && certArn
        ? acm.Certificate.fromCertificateArn(this, "ImportedCert", certArn)
        : undefined;

    /* ---------- Frontend (S3 + CloudFront) ---------- */

    const webBucket = new s3.Bucket(this, "WebBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "WebDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: customDomain ? [customDomain] : undefined,
      certificate,
      defaultRootObject: "index.html",
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
      ],
    });

    /* ---------- API (Lambda + HTTP API) ---------- */

    // pdfkit is kept as a node_module (not esbuild-inlined) because it loads
    // .afm font data files at runtime via fs.readFileSync(__dirname + '/data/...').
    const apiFn = new NodejsFunction(this, "GeneratePdfFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(repoRoot, "services", "api", "src", "handler.ts"),
      handler: "handler",
      timeout: Duration.seconds(45),
      memorySize: 1024,
      bundling: {
        minify: true,
        sourceMap: false,
        target: "es2022",
        nodeModules: ["pdfkit"],
      },
    });

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowHeaders: ["content-type"],
        allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowOrigins: ["*"],
        exposeHeaders: ["content-disposition"],
      },
    });

    httpApi.addRoutes({
      path: "/generate",
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("GenerateIntegration", apiFn),
    });

    /* ---------- Deploy SPA + runtime config ---------- */

    new s3deploy.BucketDeployment(this, "DeployWeb", {
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ["/*"],
      sources: [
        s3deploy.Source.asset(path.join(repoRoot, "apps", "web", "dist")),
        s3deploy.Source.data("config.json", JSON.stringify({ apiBaseUrl: httpApi.apiEndpoint })),
      ],
    });

    /* ---------- Outputs ---------- */

    new CfnOutput(this, "WebUrl", { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, "ApiBaseUrl", { value: httpApi.apiEndpoint });
  }
}
