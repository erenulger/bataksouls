const readline = require('readline');

let rl = null;

function getRL() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

function ask(prompt) {
  return new Promise(resolve => {
    getRL().question(prompt, answer => resolve(answer.trim()));
  });
}

function askNumber(prompt, min, max) {
  return new Promise(async resolve => {
    while (true) {
      const ans = await ask(prompt);
      const num = parseInt(ans, 10);
      if (!isNaN(num) && num >= min && num <= max) {
        resolve(num);
        return;
      }
      console.log(`  Please enter a number between ${min} and ${max}.`);
    }
  });
}

function waitForKey(prompt = '\nPress Enter to continue...') {
  return ask(prompt);
}

function close() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

module.exports = { ask, askNumber, waitForKey, close };
