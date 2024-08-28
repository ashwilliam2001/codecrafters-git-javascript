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
      process.stdout.write(hash)
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
  )

  const objectContent = fs.readFileSync(objectPath); // Read as binary buffer
  //const compressedData = Buffer.from('objectContent', 'base64');

  zlib.inflate(objectContent, (err, buffer) => { 
    if (err) {
      console.error('Error uncompressing data:', err);
      return;
    }
      const uncompressedData = buffer.toString('utf-8');
      const objectType = uncompressedData.split(" ")[0];

      switch (objectType) {
        case "blob":
          prettyPrintBlob(uncompressedData)
          break;
        case "tree":
          prettyPrintTree(uncompressedData)
          break;
        case "commit":
          console.log("commit")
          break;
        default:
          console.log("unknown object type", objectType) 
          break;
      }
}); 
}

function prettyPrintBlob(uncompressedData) {
  // Split on the first null byte to separate the header from the content
  const content = uncompressedData.split('\x00')[1];
  
  // Ensure content is a string before writing to stdout
  process.stdout.write(content);
  createObject(filePath,uncompressedData);
  return blobHash;
}

function prettyPrintTree(uncompressedData) {
  let remainingData = uncompressedData.slice(uncompressedData.indexOf('\x00') + 1);

  while (remainingData.length > 0) {
    // Extract the file mode (e.g., "100644") and file name until we reach a NULL byte
    const nullIndex = remainingData.indexOf('\x00');
    const entryHeader = remainingData.slice(0, nullIndex);
    const [fileMode, fileName] = entryHeader.split(" ");

    // The next 20 bytes (40 hex characters) are the SHA-1 hash
    const sha1 = remainingData.slice(nullIndex + 1, nullIndex + 21);
    const sha1Hex = sha1.toString('hex');

    console.log(fileName);

    // Update remainingData to continue parsing the next entry
    remainingData = remainingData.slice(nullIndex + 21);
  }
}




function lsTree() {
  const isNameOnly = process.argv[3];
  let hash = '';
  if (isNameOnly === '--name-only') {
    //display the name only
    hash = process.argv[4];
  } else {
    hash = process.argv[3];
  }
  const dirName = hash.slice(0, 2);
  const fileName = hash.slice(2);
  const objectPath = path.join(__dirname, '.git', 'objects', dirName, fileName);
  const dataFromFile = fs.readFileSync(objectPath);
  //decrypt the data from the file
  const inflated = zlib.inflateSync(dataFromFile);
  //notice before encrypting the data what we do was we encrypt
  //blob length/x00 so to get the previous string back what we need to do is split with /xoo
  const enteries = inflated.toString('utf-8').split('\x00');
  //enteries will be [blob length/x00, actual_file_content]
  const dataFromTree = enteries.slice(1);
  const names = dataFromTree
    .filter((line) => line.includes(' '))
    .map((line) => line.split(' ')[1]);
  const namesString = names.join('\n');
  const response = namesString.concat('\n');
  //this is the regex pattern that tells to replace multiple global \n with single \n
  process.stdout.write(response.replace(/\n\n/g, '\n'));
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
  function createObject(objectSubPath,compressedData){
    fs.mkdirSync(`.git/objects/${objectSubPath.split('/')[0]}`, { recursive : true})
    fs.writeFileSync(`.git/objects/${objectSubPath}`,compressedData);
 }

}

function writeTreeObject(dirPath){
  const filesAndDir = fs.readdirSync(dirPath).filter((file) => file !== ".git" && file !== "main.js");
  const entries = [];
  for(const file of filesAndDir){
     const fullPath = path.join(dirPath,file);
     if(fs.lstatSync(fullPath).isDirectory()){
        entries.push({
           mode: 40000,
           name: file,
           hash: writeTreeObject(fullPath),
        })
     }
     else{
        entries.push({
           mode:100644,
           name: file,
           hash: writeBlobObject(path.join(dirPath,file)),
        })
     }
  }
  const treeData = entries.reduce((acc,{mode,name,hash}) => {
     return Buffer.concat([
        acc,
        Buffer.from(`${mode} ${name}\0`),
        Buffer.from(hash,'hex'),
     ])
  },Buffer.alloc(0));
  const tree = Buffer.concat([
     Buffer.from(`tree ${treeData.length}\x00`),
     treeData,
  ])
  const compressedData = zlib.deflateSync(tree);
  const treeHash = createShaHash(tree); 
  fs.mkdirSync(path.resolve(dirPath,".git","objects",sliceHash(treeHash).split('/')[0]),{ recursive: true});
  fs.writeFileSync(path.resolve(dirPath,".git","objects",sliceHash(treeHash)),compressedData);
  return treeHash;
 }
