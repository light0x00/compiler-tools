import fs from "fs";
export const getMock = (fullpath: string) => fs.readFileSync(fullpath, "utf8");