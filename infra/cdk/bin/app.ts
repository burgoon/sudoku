#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { GoonbitsSudokuStack } from "../lib/goonbits-sudoku-stack.js";

const app = new App();
new GoonbitsSudokuStack(app, "GoonbitsSudokuStack", {
  env: { region: "us-east-1" },
});
