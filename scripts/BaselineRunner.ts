import Mocha from "mocha";
import fs from "fs";
import { spawn } from "child_process";
import { csvToObject } from "../src/utils/helpers.js";
import { stringify } from "csv-stringify/sync";

interface TestRunnerConfig {
  testDir: string;
  iterations: number;
  mochaOptions?: Mocha.MochaOptions;
}

interface BaselineOutputTuple {
  id: string;
  result: string;
}

interface ReferenceTuple {
  user: string;
  assistant: string;
}

interface NewReferenceTuple {
  user: string;
  assistant: string;
  mean: number;
  stdDev: number;
  threshold: number;
  iterations: number;
}

class TestRunner {
  private readonly testDir: string;
  private readonly iterations: number;
  private readonly mochaOptions: Mocha.MochaOptions;

  constructor(config: TestRunnerConfig) {
    this.testDir = config.testDir;
    this.iterations = config.iterations;
    this.mochaOptions = {
      timeout: 0,
      ui: "bdd",
      reporter: "spec",
      ...config.mochaOptions,
    };
  }

  private validateTestDirectory(): void {
    if (!fs.existsSync(this.testDir)) {
      throw new Error(`Test directory '${this.testDir}' does not exist`);
    }

    const files = fs
      .readdirSync(this.testDir)
      .filter((file) => file.endsWith(".spec.ts") || file.endsWith(".spec.js"));

    if (files.length === 0) {
      throw new Error(`No test files found in '${this.testDir}'`);
    }
  }

  private runTestProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const testProcess = spawn(
        "tsx",
        [
          "node_modules/mocha/bin/mocha",
          "--ui",
          this.mochaOptions.ui as string,
          "--reporter",
          this.mochaOptions.reporter as string,
          "--timeout",
          (this.mochaOptions.timeout || 0).toString(),
          "--no-warnings",
        ],
        {
          stdio: "inherit",
          shell: true,
        },
      );

      testProcess.on("error", (error) => {
        reject(new Error(`Failed to start test process: ${error.message}`));
      });

      testProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Test process exited with code ${code}`));
        }
      });
    });
  }

  private async runSingleIteration(iteration: number): Promise<void> {
    console.log(`\nRunning iteration ${iteration} of ${this.iterations}`);

    try {
      await this.runTestProcess();
      console.log(`Iteration ${iteration}: All tests passed!`);
    } catch (error) {
      console.error(`Error in iteration ${iteration}:`, error);
      throw error;
    }
  }

  private calculateMean = (numbers: number[]): number => {
    if (numbers.length === 0) {
      throw new Error("Array cannot be empty");
    }
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  };

  private calculateStandardDeviation = (numbers: number[]): number => {
    if (numbers.length === 0) {
      throw new Error("Array cannot be empty");
    }
    const mean = this.calculateMean(numbers);
    const variance =
      numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  };

  private calculateThreshold = (scores: number[], k = 1.96): number => {
    const mean = this.calculateMean(scores);
    const sd = this.calculateStandardDeviation(scores);
    return mean - k * sd;
  };

  private async fetchOutputAndCalculateMetrics(): Promise<void> {
    const outputFiles = fs.readdirSync("./scripts/output");

    for (let i = 0; i < outputFiles.length; i++) {
      let outputFileAsObjectArray = await csvToObject<BaselineOutputTuple>(
        `./scripts/output/${outputFiles[i]}`,
      );
      outputFileAsObjectArray = outputFileAsObjectArray.filter((tuple) => tuple.id !== "");

      const ids = [...new Set(outputFileAsObjectArray.map((tuple) => tuple.id))];
      const newReferenceData: NewReferenceTuple[] = [];

      for (let j = 0; j < ids.length; j++) {
        const scoresPerId = outputFileAsObjectArray
          .filter((tuple) => tuple.id === ids[j])
          .map((idAndResultObject) => Number(idAndResultObject.result));

        const mean = this.calculateMean(scoresPerId);
        const stdDev = this.calculateStandardDeviation(scoresPerId);
        const threshold = Math.min(...scoresPerId) - stdDev;

        const referenceCSVAsObject = await csvToObject<ReferenceTuple>(
          `./references/${outputFiles[i].replace("BaselineOutput", "")}`,
        );

        const newReferenceTuple = {
          user: referenceCSVAsObject[j].user,
          assistant: referenceCSVAsObject[j].assistant,
          mean: mean,
          stdDev: stdDev,
          threshold: threshold,
          iterations: this.iterations,
        };

        newReferenceData.push(newReferenceTuple);
      }
      const newReferenceHeaders = [
        "user",
        "assistant",
        "mean",
        "stdDev",
        "threshold",
        "iterations",
      ];

      const csvDataWithHeader = stringify(newReferenceData, {
        header: true,
        columns: newReferenceHeaders,
      });

      fs.writeFileSync(
        `./references/${outputFiles[i].replace("BaselineOutput", "")}`,
        csvDataWithHeader,
      );
    }
  }

  public async run(): Promise<void> {
    try {
      this.validateTestDirectory();

      for (let i = 1; i <= this.iterations; i++) {
        await this.runSingleIteration(i);
      }
      await this.fetchOutputAndCalculateMetrics();

      console.log(`\nCompleted all ${this.iterations} test iterations successfully!`);
    } catch (error) {
      console.error("Test execution failed:", error);
      process.exit(1);
    }
  }
}

const args = process.argv.slice(2);
const runTimes = parseInt(args[0], 10);

if (isNaN(runTimes) || runTimes <= 0) {
  console.error("Please specify a valid positive number as the first argument.");
  process.exit(1);
}

const runner = new TestRunner({
  testDir: "./src/tests/chatbot",
  iterations: runTimes,
});

await runner.run();

export { TestRunner, TestRunnerConfig };
