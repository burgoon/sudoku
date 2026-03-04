# Goonbits Sudoku Generator

Generate printable Sudoku PDF books (A5) with customizable difficulty, internal navigation links, and stylus-friendly layouts. Built for e-ink tablets like Supernote and reMarkable.

- Multiple puzzles per book with unique solutions
- Five difficulty levels (easy, medium, hard, expert, mixed)
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

Requires Node.js 20+, AWS credentials configured locally, and a one-time CDK bootstrap (replace the account ID and region with your own):

```bash
npm install
cd infra/cdk
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1
cd ../..
npm run deploy
```

The CDK stack outputs `WebUrl` and `ApiBaseUrl`. The API URL is auto-wired to the SPA at deploy time via a runtime `config.json`.

### Custom domain

To optionally serve the app from your own domain, pass `domainName` and `certificateArn` as CDK context. The certificate must be an ACM cert in `us-east-1` that covers your domain, and the domain must be in a Route53 hosted zone in the same account.

```bash
cd infra/cdk
npm run build && npx cdk deploy -c domainName=sudoku.example.com -c certificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID
```

The stack automatically creates Route53 A and AAAA alias records pointing to the CloudFront distribution.

To tear down:

```bash
npm run destroy
```

## License

MIT
