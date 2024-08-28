const fs = require("fs");
const path = require("path");
const zlib = require('zlib');
const crypto = require('crypto');


// You can use print statements as follows for debugging, they'll be visible when running tests.
//console.log("Logs from your program will appear here!");


// Uncomment this block to pass the first stage
const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file": {
    const flag = process.argv[3];
    const blobSHA = process.argv[4];
    if (flag === "-p") {
      prettyPrintObject(blobSHA);
    } else {
      throw new Error(`Unknown flag ${flag}`);
    }
    break;
  }
  

    case "hash-object": {
      const flag = process.argv[3];
      const filePath = process.argv[4];
      if (flag === "-w") {
        writeObject(filePath);
      } else {
        throw new Error(`Unknown flag ${flag}`);
      } 
      break;
    }
      

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

  //const compressedData = Buffer.from('blobContent', 'base64');

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


function createHash(input) {
  //Choose the hash algorithm(exe: sha256)
  const hash = crypto.createHash('sha1');
  //update the hash with the input data
  hash.update(input);
  //generate the hash value as a hexadecimal string
  const hashHex = hash.digest('hex');

  return hashHex;
}

function writeObject(filePath) {
  //const fileData = fs.readFileSync(filePath, "utf-8");

  fs.stat(filePath, (err, stats) => {
    if (err) {
      console.error("Error reading file:", err);
    } else {
      const fileData = fs.readFileSync(filePath, "utf-8");
      const blobContent = `blob ${stats.size}\x00${fileData}`;
      const hash = createHash(blobContent);
      //process.stdout.write(hash);

      zlib.deflate(blobContent, (err, buffer) => {
        if (err) {
          console.error("Error compressing data:", err);
        } else {
          // code to ensure only hash is output
          //console.log("compressed data:", buffer)
          //const base64Data = buffer.toString('base64');
          //console.log("Compressed data(base64):", base64Data)

          const blobDirPath = path.join(process.cwd(), ".git", "objects", hash.slice(0, 2));
          fs.mkdirSync(blobDirPath, {recursive:true});
          fs.writeFileSync(path.join(blobDirPath, hash.slice(2)), buffer)

          // Output only the SHA-1 hash
          process.stdout.write(hash +'\n');
        }
      });
    }
  });

}


