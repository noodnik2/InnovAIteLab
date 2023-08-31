
import * as fs from "fs";
import * as path from "path";

type stringContentHandler = (filePath: string, string: any) => void;
type errorHandler = (location: string, err: any) => void;

async function readFiles(dirName: any, onFileContent: stringContentHandler, onError: errorHandler) {
    fs.readdir(dirName, async function(err, fileNames) {
        if (err) {
            onError(dirName, err);
            return;
        }
        for (const fileName of fileNames) {
            const filePath = path.join(dirName, fileName);
            const fileStat = await fs.promises.stat(filePath);
            if (fileStat.isDirectory()) {
                await readFiles(filePath, onFileContent, onError);
                continue;
            }
            fs.readFile(filePath, 'utf-8', function(err, content) {
                if (err) {
                    onError(filePath, err);
                    return;
                }
                onFileContent(filePath, content);
            });
        }
    });
}

const handleError = (what: string, err: any) => {
    console.log(`error on(${what}): ${err}`)
}

const handleStringContent = (what: string, stringContent: string) => {
    console.log(`${what}: ${stringContent}`);
}

readFiles("tests/d/", handleStringContent, handleError);
