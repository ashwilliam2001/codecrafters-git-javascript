const fs = require("fs");
const path = require("path");
const zlib = require('zlib');


// You can use print statements as follows for debugging, they'll be visible when running tests.
//console.log("Logs from your program will appear here!");


// Uncomment this block to pass the first stage
const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    const flag = process.argv[3];
    const blobSHA = process.argv[4];
    if (flag === "-p") {
      prettyPrintObject(blobSHA);
    } else {
      throw new Error(`Unknown flag ${command}`);
    }
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}


function prettyPrintObject(blobSHA) {
  const blobPath = path.join(process.cwd(), ".git", "objects", blobSHA.slice(0, 2), blobSHA.slice(2));

  const blobContent = fs.readFileSync(blobPath);

  const compressedData = Buffer.from('blobContent', 'base64');

  zlib.unzip(blobContent, (err, buffer) => {
    if (err) {
      console.error('Error uncompressing data:', err);
    } else {
      const uncompressedData = buffer.toString('utf-8');
      const content = uncompressedData.split('\x00')[1];
      process.stdout.write(content);
    }
});
  
}



