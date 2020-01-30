import { safeLoad } from 'js-yaml';
import { readFile, writeFile, rmdir, copyFile, copyFileSync, mkdir, NoParamCallback, mkdtemp } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { gzip } from 'zlib';
import { execSync } from 'child_process';

export interface AssetMetaData {
    guid: string;
    folderAsset: 'yes' | 'no' | undefined
}

export const loadAssetMetaData = (data: string): AssetMetaData => safeLoad(data) as AssetMetaData;

function DoNothing(err: NodeJS.ErrnoException | null) { if (err) throw err; };

export const createUnityPackageFromFolder = (folderContainsMetaFolders: string, output: string, callback?: NoParamCallback) => {
    const archtemp = join(tmpdir(), "archtemp.tar");
    execSync('tar -cf ' + archtemp + ' -C "' + folderContainsMetaFolders + '" ./');
    readFile(archtemp, (err, data) => {
        if (err) throw err;
        gzip(data, (err, data) => {
            if (err) throw err;
            writeFile(output, data, () => rmdir(folderContainsMetaFolders, callback || DoNothing));
        });
    });
};

export const createMetaFolderUnderFolder = (folderContainsMetaFolders: string, metaFileRelativePathWithExtension: string, projectRoot: string, callback?: NoParamCallback) => {
    const metaFileAbsolutePath = join(projectRoot, metaFileRelativePathWithExtension);
    readFile(metaFileAbsolutePath, { encoding: "utf-8" }, async (err, data) => {
        if (err) throw err;
        const metaDatum = loadAssetMetaData(data);
        const guid = metaDatum.guid;
        const dir = join(folderContainsMetaFolders, guid);

        mkdir(dir, () => {
            copyFile(metaFileAbsolutePath, join(dir, "asset.meta"), () => {
                if (metaDatum.folderAsset !== "yes") {
                    const assetFileAbsolutePath = metaFileAbsolutePath.substr(0, metaFileAbsolutePath.length - 5);
                    copyFileSync(assetFileAbsolutePath, join(dir, "asset"));
                }

                const assetFileRelativePath = metaFileRelativePathWithExtension.substr(0, metaFileRelativePathWithExtension.length - 5);
                writeFile(join(dir, "pathname"), assetFileRelativePath, callback || DoNothing);
            });
        });
    });
};

const createUnityPackageFromMetaFilePathsWithTempFolder = (metaFiles: string[], projectRoot: string, output: string, folderContainsMetaFolders: string) => {
    const processHasDone = new Array(metaFiles.length);
    processHasDone.fill(false);
    metaFiles.forEach((metaFilePath, index, _) => {
        const callback = () => {
            processHasDone[index] = true;
            if (processHasDone.indexOf(false) === -1)
                createUnityPackageFromFolder(folderContainsMetaFolders, output);
        };
        createMetaFolderUnderFolder(metaFilePath, projectRoot, folderContainsMetaFolders, callback);
    });
};

export const createUnityPackageFromMetaFilePaths = (metaFiles: string[], projectRoot: string, output: string) => {
    mkdtemp("tempFolder", (err, folder) => {
        if (err) throw err;
        const folderContainsMetaFolders = join(folder, 'archtemp');
        mkdir(folderContainsMetaFolders, () => {
            createUnityPackageFromMetaFilePathsWithTempFolder(metaFiles, projectRoot, output, folderContainsMetaFolders);
        });
    });
};