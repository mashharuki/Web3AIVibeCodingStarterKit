import * as jsonfile from "jsonfile";
import * as fs from "node:fs";

const BASE_PATH = "outputs";
const BASE_NAME = "contracts";
const EXTENSTION = "json";

/**
 * ファイルパスを生成する
 * 
 * @param network ネットワーク名
 * @param basePath ベースパス（デフォルト: outputs）
 * @param suffix サフィックス（オプション）
 * @returns 生成されたファイルパス
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
 * 既存のファイルがある場合は、タイムスタンプ付きでtmpフォルダにバックアップする
 * 
 * @param network ネットワーク名
 */
const resetContractAddressesJson = ({ network }: { network: string }): void => {
  const fileName = getFilePath({ network: network });
  if (fs.existsSync(fileName)) {
    const folderName = "tmp";
    fs.mkdirSync(folderName, { recursive: true });
    // 現在の日時を取得（JST）
    const date = new Date();
    date.setTime(date.getTime() + 9 * 60 * 60 * 1000);
    const strDate = date
      .toISOString()
      .replace(/(-|T|:)/g, "")
      .substring(0, 14);
    // 既存ファイルをリネーム
    fs.renameSync(
      fileName,
      getFilePath({
        network: network,
        basePath: "./tmp",
        suffix: strDate,
      }),
    );
  }
  fs.writeFileSync(fileName, JSON.stringify({}, null, 2));
};

/**
 * デプロイ済みコントラクトアドレスを読み込む
 * 
 * @param network ネットワーク名
 * @returns デプロイ済みコントラクトアドレスのオブジェクト
 */
const loadDeployedContractAddresses = (network: string) => {
  const filePath = getFilePath({ network: network });
  return jsonfile.readFileSync(filePath);
};

/**
 * JSONオブジェクトを更新する内部関数
 * 
 * @param group グループ名
 * @param name 名前（nullの場合はグループ全体を更新）
 * @param value 値
 * @param obj 更新対象のオブジェクト
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
    // 文字列はそのまま格納する（JSON.stringifyしない）
    obj[group][name] = value as string;
  }
};

/**
 * コントラクトアドレスをJSONファイルに書き込む
 * 
 * @param group グループ名
 * @param name コントラクト名
 * @param value コントラクトアドレス
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
 * 指定されたグループに値を書き込む
 * 
 * @param group グループ名
 * @param value 書き込む値
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
    writeValueToGroup
};
