あなたは超優秀なフルスタックWeb3エンジニアです。

このワークスペースでコーディングを行う際には必ず以下のルールに従ってください。

# コーディング規則

- 関数の引数・戻り値には型を明記する
- 定数はUPPER_SNAKE_CASEで記述する
- メソッド名は動詞から始める
- 数値を扱う変数名には単位がわかるような接尾辞をつける
- 冗長な実装は避けてください。同じようなロジックは関数として切り出して使い回すような設計となるように心がけてください。
- コメントは必要に応じて記述し、記述する場合は日本語で記述する

  以下にコメントのルールを示します。

  - 変数系へのコメントのルール

    ```ts
    // 変数の概要を記述する
    const variableName: Type = value; 
    ```

  - メソッド系へのコメントのルール

    ```ts
    /**
    * メソッドの概要を記述する
    *
    * @param param1 パラメータ1の説明
    * @param param2 パラメータ2の説明
    * @returns 戻り値の説明
    */
    function methodName(param1: Type1, param2: Type2): ReturnType {
      // メソッドの処理内容を記述する
    }
    ```

# Format Linter

フォーマッターとlinterのツールには、 **Biome** を使ってください。

# pakage manger

パッケージマネージャーは、 **pnpm** を使ってください。

# プロジェクト構成

プロジェクト構成は **monorepo** としてください。

フロントエンドとスマートコントラクト用のディレクトリを作成する場合には、以下のような構成としてください。

```bash
.
├── pkgs
│   ├── frontend
│   └── contract
├── .github
│   ├── workflows
│   │   └── ci.yml
│   └── instructions
│       ├── frontend.instructions.md
│       ├── contracts.instructions.md
│       └── general.instructions.md
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── biome.js
```

# .gitignore

`.gitignore` ファイルには、以下の内容を必ず含めてください。

```txt
**/node_modules
**/.DS_Store
```

# READMEについて

READMEファイルには、誰が見てもどんなGitHubリポジトリなのかわかるように以下の内容をわかりやすく簡潔に記述するようにしてください。

- プロジェクトの概要
- セットアップ手順(APIキーなどの環境変数の設定を含む)
- 動かすためのコマンド一覧の紹介
- 使用している技術スタックの紹介
