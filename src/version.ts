// 画面に出すバージョン（設計書 5.8・共通の決まり C1）。値は package.json からビルド時に埋め込まれる
export const APP_VERSION: string = __APP_VERSION__;

export function formatVersion(version: string): string {
  return `v${version}`;
}
