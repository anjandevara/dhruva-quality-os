import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';

/**
 * Universal environment configuration loader supporting process.env and .env fallbacks.
 */
export class EnvironmentConfig {
  private static isConfigLoaded: boolean = false;

  /**
   * WHAT: Initializes environment variables safely.
   * WHY: Enables seamless credential access in both local development and CI pipelines.
   * HOW: Checks if .env file exists on disk; if found loads via dotenv, otherwise relies on CI process.env.
   */
  static loadConfiguration(): void {
    if (this.isConfigLoaded) return;

    const targetEnvironment = process.env.ENV || 'qa';
    const envFilePath = path.resolve(__dirname, `../../config/.env.${targetEnvironment}`);

    if (fs.existsSync(envFilePath)) {
      dotenv.config({ path: envFilePath });
      Logger.info(`Loaded local environment configuration from: .env.${targetEnvironment}`);
    } else {
      Logger.info(`No local .env file found on disk. Utilizing CI/CD process environment variables.`);
    }

    this.isConfigLoaded = true;
  }

  /**
   * WHAT: Returns a required environment variable string value.
   * WHY: Provides fail-fast validation if a critical secret is missing.
   * HOW: Reads process.env and throws a descriptive error if undefined.
   */
  static getRequiredVariable(variableKey: string): string {
    this.loadConfiguration();
    const value = process.env[variableKey];
    if (!value) {
      throw new Error(`CRITICAL CONFIG ERROR: Required environment variable [${variableKey}] is missing in process.env.`);
    }
    return value;
  }

  /**
   * WHAT: Returns an optional environment variable with a default fallback.
   * WHY: Prevents hard failures for non-critical configuration values.
   * HOW: Reads process.env with fallback.
   */
  static getOptionalVariable(variableKey: string, fallbackValue: string): string {
    this.loadConfiguration();
    return process.env[variableKey] || fallbackValue;
  }
}
