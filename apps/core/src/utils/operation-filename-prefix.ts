import * as path from 'path';
import {formattedDate} from './formatted-date';
export const prefixFileWithDate = (outputPath: string) => {
  // output Path is in this form:
  const dirPath = path.dirname(outputPath);
  const file = path.basename(outputPath);
  const currentDate = formattedDate();
  return dirPath + '/' + currentDate + '-' + file;
};
