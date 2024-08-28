const fs = require("fs");
const path = require("path");
const zlib = require('zlib');
const crypto = require('crypto');

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
      const hash = writeObject(filePath);
      process.stdout.write(hash + '\n'); // Ensure it outputs the hash with a newline
    } else {
      throw new Error(`Unknown flag ${flag}`);
    }
    break;
  }
  case "ls-tree": {
    const flag = process.argv[3];
    const treeSHA = process.argv[4];
    if (flag === "--name-only") {
      prettyPrintObject(treeSHA);
    } else {
      throw new Error(`Unknown flag ${flag}`);
    }
    break;
  }
  case "write-tree": {
    const hash = writeTreeObject('./');
    process.stdout.write(hash + '\n'); // Ensure it only outputs the hash with a newline
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

function prettyPrintObject(objectSHA) {
  const objectPath = path.join(
    process.cwd(), 
    ".git", 
    "objects", 
    objectSHA.slice(0, 2), 
    objectSHA.slice(2)
  );
  const objectContent = fs.readFileSync(objectPath);
  zlib.inflate(objectContent, (err, buffer) => { 
    if (err) {
      console.error('Error uncompressing data:', err);
      return;
    }
    const uncompressedData = buffer.toString('utf-8');
    const objectType = uncompressedData.split(" ")[0];
    switch (objectType) {
      case "blob":
        prettyPrintBlob(uncompressedData);
        break;
      case "tree":
        prettyPrintTree(uncompressedData);
        break;
      case "commit":
        console.log("commit");
        break;
      default:
        console.log("unknown object type", objectType);
        break;
    }
  });
}

function prettyPrintBlob(uncompressedData) {
  const content = uncompressedData.split('\x00')[1];
  process.stdout.write(content);
}

function prettyPrintTree(uncompressedData) {
  let remainingData = uncompressedData.slice(uncompressedData.indexOf('\x00') + 1);
  while (remainingData.length > 0) {
    const nullIndex = remainingData.indexOf('\x00');
    const entryHeader = remainingData.slice(0, nullIndex);
    const [fileMode, fileName] = entryHeader.split(" ");
    const sha1 = remainingData.slice(nullIndex + 1, nullIndex + 21);
    const sha1Hex = sha1.toString('hex');
    console.log(fileName);
    remainingData = remainingData.slice(nullIndex + 21);
  }
}

function createHash(input) {
  const hash = crypto.createHash('sha1');
  hash.update(input);
  return hash.digest('hex');
}

function writeObject(filePath) {
  const fileContent = fs.readFileSync(filePath);
  const objectData = Buffer.concat([
    Buffer.from(`blob ${fileContent.length}\x00`),
    fileContent,
  ]);

  const compressedData = zlib.deflateSync(objectData);
  const objectHash = createHash(objectData);

  // Ensure the directory exists
  const objectDir = path.join(process.cwd(), ".git", "objects", objectHash.slice(0, 2));
  fs.mkdirSync(objectDir, { recursive: true });
  
  // Write compressed data to the file
  fs.writeFileSync(path.join(objectDir, objectHash.slice(2)), compressedData);

  return objectHash;
}


function writeTreeObject(dirPath) {
  const filesAndDir = fs.readdirSync(dirPath).filter((file) => file !== ".git" && file !== "main.js");
  const entries = [];
  
  for (const file of filesAndDir) {
    const fullPath = path.join(dirPath, file);
    
    if (fs.lstatSync(fullPath).isDirectory()) {
      entries.push({
        mode: 40000,
        name: file,
        hash: writeTreeObject(fullPath),
      });
    } else {
      entries.push({
        mode: 100644,
        name: file,
        hash: writeObject(fullPath),
      });
    }
  }
  
  const treeData = entries.reduce((acc, { mode, name, hash }) => {
    return Buffer.concat([
      acc,
      Buffer.from(`${mode} ${name}\0`),
      Buffer.from(hash, 'hex'),
    ]);
  }, Buffer.alloc(0));
  
  const tree = Buffer.concat([
    Buffer.from(`tree ${treeData.length}\x00`),
    treeData,
  ]);
  
  const compressedData = zlib.deflateSync(tree);
  const treeHash = createHash(tree);
  
  // Ensure directory exists
  const treeDir = path.join(process.cwd(), ".git", "objects", treeHash.slice(0, 2));
  fs.mkdirSync(treeDir, { recursive: true });
  
  // Write compressed data to the file
  fs.writeFileSync(path.join(treeDir, treeHash.slice(2)), compressedData);
  
  return treeHash;
}

