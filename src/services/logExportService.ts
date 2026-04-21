import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {getRecentLogs} from './databaseService';

export async function exportLogsToShareSheet(): Promise<string> {
  const logs = await getRecentLogs(500);
  const payload = JSON.stringify(logs, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `${RNFS.DocumentDirectoryPath}/hs-logs-${timestamp}.json`;

  await RNFS.writeFile(filePath, payload, 'utf8');

  await Share.open({
    title: 'Export HS logs',
    url: `file://${filePath}`,
    type: 'application/json',
    failOnCancel: false,
  });

  return filePath;
}
