// const express = require("express");
import express from "express";
import { createLinter, loadTextlintrc, loadLinterFormatter } from "textlint";

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
  const descriptor = await loadTextlintrc();
  const linter = createLinter({ descriptor });
  // const results = await linter.lintFiles(["*.md"]);
  const results = await linter.lintText("Hello", "dummy.md");
  // textlint has two types formatter sets for linter and fixer
  const formatter = await loadLinterFormatter({ formatterName: "stylish" });
  const output = formatter.format(results);
  // console.log(output);
  res.send(output);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
