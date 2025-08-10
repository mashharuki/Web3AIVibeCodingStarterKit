import jsonfile from "jsonfile";
import fs from "node:fs";

const BASE_PATH = "outputs";
const BASE_NAME = "contracts";
const EXTENSTION = "json";

/**
 * ファイルパスを生成する
 *
 * @param network ネットワーク名
 * @param basePath ベースパス
 * @param suffix サフィックス
 * @returns ファイルパス
 */
const getFilePath = ({
  network,
  basePath,
  suffix,
}: {
  network: string;
  basePath?: string;
  suffix?: string;
}): string => {
  const _basePath = basePath ? basePath : BASE_PATH;
  const commonFilePath = `${_basePath}/${BASE_NAME}-${network}`;
  return suffix
    ? `${commonFilePath}-${suffix}.${EXTENSTION}`
    : `${commonFilePath}.${EXTENSTION}`;
};

/**
 * コントラクトアドレスのJSONファイルをリセットする
 *
 * @param network ネットワーク名
 */
const resetContractAddressesJson = ({ network }: { network: string }): void => {
  const fileName = getFilePath({ network: network });
  if (fs.existsSync(fileName)) {
    const folderName = "tmp";
    fs.mkdirSync(folderName, { recursive: true });
    // 現在の日時を取得
    const date = new Date();
    date.setTime(date.getTime() + 9 * 60 * 60 * 1000);
    const strDate = date
      .toISOString()
      .replace(/(-|T|:)/g, "")
      .substring(0, 14);
    // 現在のファイルをリネーム
    fs.renameSync(
      fileName,
      getFilePath({
        network: network,
        basePath: "./tmp",
        suffix: strDate,
      })
    );
  }
  fs.writeFileSync(fileName, JSON.stringify({}, null, 2));
};

/**
 * デプロイされたコントラクトアドレスを読み込む
 *
 * @param network ネットワーク名
 * @returns コントラクトアドレス一覧
 */
const loadDeployedContractAddresses = (network: string) => {
  const filePath = getFilePath({ network: network });
  return jsonfile.readFileSync(filePath);
};

/**
 * JSONオブジェクトを更新する
 *
 * @param group グループ名
 * @param name キー名
 * @param value 値
 * @param obj 更新対象オブジェクト
 */
const _updateJson = ({
  group,
  name,
  value,
  obj,
}: {
  group: string;
  name: string | null;
  value: Record<string, string> | string;
  obj: Record<string, Record<string, string>>;
}) => {
  if (obj[group] === undefined) obj[group] = {};
  if (name === null) {
    obj[group] = value as Record<string, string>;
  } else {
    if (obj[group][name] === undefined) obj[group][name] = "";
    obj[group][name] = value as string;
  }
};

/**
 * コントラクトアドレスを書き込む
 *
 * @param group グループ名
 * @param name コントラクト名
 * @param value アドレス
 * @param network ネットワーク名
 */
const writeContractAddress = ({
  group,
  name,
  value,
  network,
}: {
  group: string;
  name: string | null;
  value: string;
  network: string;
}) => {
  try {
    const filePath = getFilePath({ network: network });
    const base = jsonfile.readFileSync(filePath);
    _updateJson({
      group: group,
      name: name,
      value: value,
      obj: base,
    });
    const output = JSON.stringify(base, null, 2);
    fs.writeFileSync(filePath, output);
  } catch (e) {
    console.log(e);
  }
};

/**
 * グループに値を書き込む
 *
 * @param group グループ名
 * @param value 値
 * @param fileName ファイル名
 */
const writeValueToGroup = ({
  group,
  value,
  fileName,
}: {
  group: string;
  value: Record<string, string> | string;
  fileName: string;
}) => {
  try {
    const base = jsonfile.readFileSync(fileName);
    _updateJson({ group: group, name: null, value: value, obj: base });
    const output = JSON.stringify(base, null, 2);
    fs.writeFileSync(fileName, output);
  } catch (e) {
    console.log(e);
  }
};

export {
  getFilePath,
  loadDeployedContractAddresses,
  resetContractAddressesJson,
  writeContractAddress,
  writeValueToGroup,
};
