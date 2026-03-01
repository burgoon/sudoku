# Goonbits Sudoku Generator

Generate printable Sudoku PDF books (A5) with customizable difficulty, internal navigation links, and stylus-friendly layouts. Built for e-ink tablets like Supernote and reMarkable.

- 1-100 puzzles per book with unique solutions
- Four difficulty levels
- Cover page, table of contents, and solution pages
- Font selection

## Tech

| Layer    | Stack                                              |
| -------- | -------------------------------------------------- |
| Frontend | React, Vite, TypeScript                            |
| Backend  | Node.js, PDFKit, Express (dev) / AWS Lambda (prod) |
| Infra    | AWS CDK v2, CloudFront, API Gateway, S3            |

## Development

```bash
npm install
npm run dev
```

Web runs at `http://localhost:5173`, API at `http://localhost:3001`.

## Deploy

Requires Node.js 18+, AWS credentials configured locally, and a one-time CDK bootstrap (replace the account ID and region with your own):

```bash
npm install
npm run build
cd infra/cdk
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1
cd ../..
npm run deploy
```

The CDK stack outputs `WebUrl` and `ApiBaseUrl`. The API URL is auto-wired to the SPA at deploy time via a runtime `config.json`.

### Custom domain

To optionally serve the app from your own domain, pass `domainName` and `certificateArn` as CDK context. The certificate must be an ACM cert in `us-east-1` that covers your domain.

```bash
cd infra/cdk
npx cdk deploy -c domainName=sudoku.example.com -c certificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID
```

You'll also need a DNS record (CNAME or alias) pointing your domain to the CloudFront distribution URL from the `WebUrl` output.

To tear down:

```bash
npm run destroy
```

## License

MIT
