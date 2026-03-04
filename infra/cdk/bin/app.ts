#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { GoonbitsSudokuStack } from "../lib/goonbits-sudoku-stack.js";

const app = new App();
new GoonbitsSudokuStack(app, "GoonbitsSudokuStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
