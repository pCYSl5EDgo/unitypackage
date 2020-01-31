import { safeLoad } from 'js-yaml';
import { readFile, writeFile, copyFile, copyFileSync, mkdir, NoParamCallback, mkdtemp, rename, rmdirSync, mkdirSync, RmDirAsyncOptions, exists } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';

export interface AssetMetaData {
    guid: string;
    folderAsset: 'yes' | 'no' | undefined
}

export module InternalImplementation {
    export const loadAssetMetaData = (data: string): AssetMetaData => safeLoad(data) as AssetMetaData;
    function NoOperation(err: NodeJS.ErrnoException | null) { if (err) throw err; };
    const recursiveDelete: RmDirAsyncOptions = { recursive: true };
    export function createUnityPackageFromFolder(
        folderContainsMetaFolders: string,
        output: string,
        callback?: NoParamCallback,
        logger?: (logText: string) => void,
        removeDirs?: string[],
    ): void {
        const tmpDirectory = join(tmpdir(), "tmp");
        const archtemp = join(tmpDirectory, "archtemp.tar");
        rmdirSync(tmpDirectory, recursiveDelete);
        mkdirSync(tmpDirectory);
        function totalEnd(): void {
            const archtemp_gzip = archtemp + '.gz';
            copyFile(archtemp_gzip, output, (err) => {
                if (err) {
                    throw err;
                }
                if (removeDirs) {
                    for (const removeDir of removeDirs) {
                        rmdirSync(removeDir, recursiveDelete);
                    }
                }
                rmdirSync(tmpDirectory, recursiveDelete);
                if (callback)
                    callback(null);
            });
        };
        exec('tar -cf "' + archtemp + '" -C "' + folderContainsMetaFolders + '" .', (err, stdout, stderr) => {
            if (err) {
                if (logger) {
                    logger('stdout : ' + stdout);
                    logger('stderr : ' + stderr);
                }
                throw err;
            }
            const sevenZipPath = '"C:\\Program Files\\7-Zip\\7z.exe"';
            exists(sevenZipPath, (doesExist) => {
                if (doesExist) {
                    exec(sevenZipPath + ' a -tgzip "' + archtemp + '.gz" "' + archtemp + '"', totalEnd);
                }
                else {
                    exec('gzip -f "' + archtemp + '"', totalEnd);
                }
            });
        });
    };

    export function createMetaFolderUnderFolder(
        metaFileRelativePathWithExtension: string,
        projectRoot: string,
        folderContainsMetaFolders: string,
        callback?: NoParamCallback,
        logger?: (logText: string) => void,
    ): void {
        const metaFileAbsolutePath = join(projectRoot, metaFileRelativePathWithExtension);
        readFile(metaFileAbsolutePath, { encoding: "utf-8" }, async (err, data) => {
            if (err) throw err;
            const metaDatum = loadAssetMetaData(data);
            const guid = metaDatum.guid;
            const dir = join(folderContainsMetaFolders, guid);

            if (logger)
                logger('create-directory : ' + dir);
            mkdir(dir, () => {
                copyFile(metaFileAbsolutePath, join(dir, "asset.meta"), () => {
                    if (metaDatum.folderAsset !== "yes") {
                        const assetFileAbsolutePath = metaFileAbsolutePath.substr(0, metaFileAbsolutePath.length - 5);
                        copyFileSync(assetFileAbsolutePath, join(dir, "asset"));
                    }

                    const assetFileRelativePath = metaFileRelativePathWithExtension.substr(0, metaFileRelativePathWithExtension.length - 5);
                    writeFile(join(dir, "pathname"), assetFileRelativePath, callback || NoOperation);
                });
            });
        });
    };
    export function createUnityPackageFromMetaFilePathsWithTempFolder(
        metaFiles: string[],
        projectRoot: string,
        output: string,
        folderContainsMetaFolders: string,
        logger?: (logText: string) => void,
        removeDirs?: string[],
    ): void {
        const processHasDone = new Array(metaFiles.length);
        processHasDone.fill(false);
        metaFiles.forEach((metaFilePath, index, _) => {
            const callback = () => {
                processHasDone[index] = true;
                if (processHasDone.indexOf(false) === -1)
                    createUnityPackageFromFolder(folderContainsMetaFolders, output, NoOperation, logger, removeDirs);
            };
            createMetaFolderUnderFolder(metaFilePath, projectRoot, folderContainsMetaFolders, callback, logger);
        });
    };
}

export default function createUnityPackage(metaFiles: string[], projectRoot: string, output: string, logger?: (logText: string) => void): void {
    mkdtemp("tempFolder", (err, folder) => {
        if (err) {
            if (logger)
                logger('failedName : ' + folder || '`empty`');
            throw err;
        }
        const folderContainsMetaFolders = join(folder, 'archtemp');
        mkdir(folderContainsMetaFolders, () => {
            const create = InternalImplementation.createUnityPackageFromMetaFilePathsWithTempFolder;
            create(metaFiles, projectRoot, output, folderContainsMetaFolders, logger, [folder]);
        });
    });
};