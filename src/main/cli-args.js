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
  const knownElectronFlags = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--disable-gpu'
  ];
  
  // Track if we see any CLI-specific flags
  let hasCliFlags = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      showHelp = true;
      hasCliFlags = true;
      continue;
    }

    if (arg === '--xlsx') {
      hasCliFlags = true;
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
      hasCliFlags = true;
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        errors.push('Missing value for --out.');
      } else {
        outputPath = value;
        i += 1;
      }
      continue;
    }

    // Ignore known Electron flags silently
    if (knownElectronFlags.includes(arg)) {
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

  // Only enter CLI mode if we actually have CLI-specific flags
  if (!hasCliFlags) {
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
