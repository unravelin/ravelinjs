import path from 'path';
import { expect } from 'chai';
import * as ts from 'typescript';

describe('TypeScript type-checking', () => {
  const { options } = getTsConfig();
  /** @type {ts.CompilerOptions} */
  const testOptions = { ...options, noEmit: true };

  it('should pass type-checking for a valid use of RavelinJS', () => {
    const fileName = import.meta.dirname + '/test-import.ts';

    // Create the program with default compiler options
    const program = ts.createProgram([fileName], testOptions);

    // Retrieve all semantic and syntactic diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program);

    // If diagnostics are empty, the file passed type-checking
    expect(diagnostics).to.have.lengthOf(
      0,
      diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n')
    );
  });

  it('should fail type-checking with an invalid RavelinJS config option', () => {
    const fileName = import.meta.dirname + '/test-import-err.ts';

    // Create the program with default compiler options
    const program = ts.createProgram([fileName], testOptions);

    // Retrieve all semantic and syntactic diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program);

    // Expect one error about the invalid config property
    expect(diagnostics.length).to.equal(1);

    const error = diagnostics[0];
    expect(error.code).to.equal(2353);
    expect(error.messageText).to.include("'track' does not exist in type 'CoreConfig'");
  });
});

function getTsConfig() {
  const configPath = ts.findConfigFile(import.meta.dirname, ts.sys.fileExists, 'tsconfig.json');

  if (!configPath) {
    throw new Error(`Could not find "${configPath}"`);
  }

  // Read and parse the file
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  // Resolve 'extends' and generate final compiler options
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );

  return parsedConfig;
}
