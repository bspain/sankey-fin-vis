function getCliHelpText() {
  return [
    'Usage:',
    '  sankey-fin-vis --xlsx <input.xlsx> --out <output.csv>',
    '',
    'Options:',
    '  --xlsx <path>   Path to the Excel file to convert',
    '  --out <path>    Target CSV output path',
    '  -h, --help      Show this help message'
  ].join('\n');
}

function parseCliArgs(argv) {
  const args = argv.filter((arg) => arg !== '--');
  let inputPath = null;
  let outputPath = null;
  let showHelp = false;
  const errors = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      showHelp = true;
      continue;
    }

    if (arg === '--xlsx') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        errors.push('Missing value for --xlsx.');
      } else {
        inputPath = value;
        i += 1;
      }
      continue;
    }

    if (arg === '--out') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        errors.push('Missing value for --out.');
      } else {
        outputPath = value;
        i += 1;
      }
      continue;
    }

    errors.push('Unknown argument: ' + arg);
  }

  if (showHelp) {
    return {
      mode: 'help',
      inputPath,
      outputPath,
      errors: []
    };
  }

  const hasArgs = args.length > 0;
  if (!hasArgs) {
    return {
      mode: 'none',
      inputPath: null,
      outputPath: null,
      errors: []
    };
  }

  if (!inputPath) {
    errors.push('Missing --xlsx argument.');
  }

  if (!outputPath) {
    errors.push('Missing --out argument.');
  }

  if (errors.length > 0) {
    return {
      mode: 'error',
      inputPath,
      outputPath,
      errors
    };
  }

  return {
    mode: 'convert',
    inputPath,
    outputPath,
    errors: []
  };
}

module.exports = { getCliHelpText, parseCliArgs };
