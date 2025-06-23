# ひつじ on Discord

自分のための便利 Discord Bot

# 機能

## スラッシュコマンド

この Bot が導入されているサーバーでスラッシュコマンドを実行します。

## 校正

特定のチャンネルに送信されたメッセージを校正します。

# デプロイ

## 必要なファイルを作成

まずは必要なファイルを作成、編集する。

```bash
cp .env.example .env
cp config.example.json config.json
```

- `.env`: アプリケーションモード、アプリケーション ID、トークン、テスト用のサーバー ID の指定
- `config.json`: 校正プリセットとチャンネルの紐づけなど

## スラッシュコマンドのデプロイ

本番デプロイするときは`.env`の`APP_MODE`を`production`にして、以下のコマンドを実行する。

```bash
pnpm deploy-commands
```

## アプリケーションの起動

以下のコマンドを実行する。

```bash
pnpm start
```
