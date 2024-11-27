import path from "path";
import * as fs from "fs";
import { stringify } from "csv-stringify/sync";
import { ReferenceModel } from "./ReferenceModel.js";
import { csvToObject } from "../utils/helpers.js";
import { calculateSimilarity } from "./functions/Compare.js";
import { processClaimCheck } from "./functions/FactCheck.js";
import { evalCriteria } from "./functions/Eval.js";

interface ScorerOptions {
  factCheckThreshold?: number;
  evalThreshold?: number;
  referenceFilePath?: string;
  referenceIndex?: number;
  reference?: ReferenceModel[];
}

export class Scorer {
  private factCheckThreshold: number;
  private evalThreshold?: number;
  referenceFilePath: string;
  public referenceIndex: number;
  public reference: ReferenceModel[];
  private scoresPerFileArray: number[] = [];
  private outputFilePath: string | undefined;

  constructor({
    referenceIndex = -1,
    factCheckThreshold = 0.9,
    evalThreshold = 0.9,
    referenceFilePath = "",
    reference = [],
  }: ScorerOptions = {}) {
    this.evalThreshold = evalThreshold;
    this.reference = reference;
    this.referenceIndex = referenceIndex;
    this.referenceFilePath = referenceFilePath;
    this.factCheckThreshold = factCheckThreshold;
  }

  public static async create(options: ScorerOptions = {}): Promise<Scorer> {
    const { referenceFilePath } = options;

    if (!referenceFilePath) {
      throw new Error("Reference file path is required.");
    }

    const resolvedFilePath = path.resolve(referenceFilePath);

    if (!fs.existsSync(resolvedFilePath)) {
      const header = ["user", "assistant"];
      const csvContent = stringify([], { header: true, columns: header });

      fs.writeFileSync(resolvedFilePath, csvContent);
    }

    let reference: ReferenceModel[] = [];

    if (fs.existsSync(resolvedFilePath)) {
      reference = await csvToObject<ReferenceModel>(resolvedFilePath);
    }

    return new Scorer({
      ...options,
      reference,
    });
  }

  public async compare(candidate: string, userQuery?: string): Promise<void> {
    let score: number;
    this.referenceIndex++;
    const reference = this.reference[this.referenceIndex]?.assistant;

    if (process.env["RUN_MODE"] === "first") {
      if (userQuery) {
        this.saveToCSV(userQuery, candidate);
      } else {
        throw new Error("User query must be provided on first run");
      }
    } else if (reference) {
      score = await calculateSimilarity(candidate, reference);

      console.log("Similarity score:", Math.floor(score * 100) / 100);

      if (process.env["RUN_MODE"] === "baseline") {
        this.scoresPerFileArray.push(score);

        if (!this.outputFilePath) {
          if (this.referenceFilePath) {
            const filename = `${this.referenceFilePath
              .split("/")
              .pop()
              ?.split(".")
              .shift()}BaselineOutput.csv`;
            this.outputFilePath = path.join("./scripts/output", filename);
          } else {
            throw new Error(
              "Could not determine reference file name. Unable to create output file",
            );
          }
        }

        if (fs.existsSync(this.outputFilePath)) {
          const data = [{ id: this.referenceIndex, result: score }];
          const headers = ["id", "result"];
          const csvDataWithHeader = stringify(data, { columns: headers });
          fs.appendFileSync(this.outputFilePath, csvDataWithHeader);
        } else {
          const data = [
            {
              id: 0,
              result: score,
            },
          ];
          const headers = ["id", "result"];
          const csvDataWithHeader = stringify(data, { header: true, columns: headers });
          fs.writeFileSync(this.outputFilePath, csvDataWithHeader);
        }
      } else {
        if (score < Number(this.reference[this.referenceIndex]?.threshold)) {
          console.log(
            "Expected similarity score to be at least ",
            Number(this.reference[this.referenceIndex]?.threshold),
            " but got ",
            score,
          );
        }
      }
    }
  }

  public async factCheck(
    userQueries: string[],
    assistantResponse: string,
    cot = true,
    factCheckThreshold?: number,
  ): Promise<void> {
    if (process.env["RUN_MODE"] === "test") {
      const scoreThreshold = factCheckThreshold ?? this.factCheckThreshold;

      const factCheckResult = await processClaimCheck(
        userQueries.join(", "),
        assistantResponse,
        cot,
      );

      console.log("Fact Check score", factCheckResult.claimCheckPassPercentage / 100);

      if (factCheckResult.claimCheckPassPercentage / 100 < scoreThreshold) {
        console.log(
          "Expected fact check score to be at least ",
          this.factCheckThreshold,
          " but got ",
          factCheckResult.claimCheckPassPercentage / 100,
        );
      }
    }
  }

  public async eval(
    criteria: string[],
    assistantResponse: string,
    cot = true,
    dbAccess = true,
    evalThreshold = 0.9,
  ): Promise<void> {
    if (process.env["RUN_MODE"] === "test") {
      const scoreThreshold = evalThreshold ?? this.evalThreshold;

      const evalResponse = await evalCriteria(criteria, assistantResponse, cot, dbAccess);

      console.log("Eval score", evalResponse.evalPassPercentage / 100);

      if (evalResponse.evalPassPercentage / 100 < scoreThreshold) {
        console.log(
          "Expected eval score to be at least ",
          this.factCheckThreshold,
          " but got ",
          evalResponse.evalPassPercentage / 100,
        );
      }
    }
  }

  private saveToCSV(user: string, assistant: string): void {
    const filePath = path.resolve(this.referenceFilePath);

    const formattedUserQuery = `${user.replace(/\n/g, " ")}`;
    const formattedAssistantResponse = `${assistant.replace(/\n/g, " ")}`;

    const data = [
      {
        user: formattedUserQuery,
        assistant: formattedAssistantResponse,
      },
    ];

    const fileExists = fs.existsSync(filePath);
    const fileIsEmpty = fileExists && fs.statSync(filePath).size === 0;

    if (!fileExists || fileIsEmpty) {
      const header = ["user", "assistant"];
      const csvDataWithHeader = stringify(data, {
        header: true,
        columns: header,
      });
      fs.writeFileSync(filePath, csvDataWithHeader);
    } else {
      const csvData = stringify(data, { quote: '"', quoted: true, columns: ["user", "assistant"] });
      fs.appendFileSync(filePath, csvData);
    }
  }
}
