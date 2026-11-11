# teihen-nomad
## 国別ページ（検索用）の更新
`data/countries.json` を直したら、次を実行して、`country/` と `sitemap.xml` をコミットします。
```
node tools/build-country-pages.js
```
検索に載せるのは、出典で確認できた国だけです（概算のみの国は noindex）。


## 自動更新（GitHub Actions）
- `.github/workflows/news.yml`：日本時間 7:00 / 12:00 / 19:00 にニュース見出しを `data/news.json` に保存。
- `.github/workflows/monthly.yml`：毎月1日に為替（`data/fx.json`）を更新し、国別・街ページとサイトマップを作り直す。
- どちらも、Actionsの画面の「Run workflow」から、手動でも実行できる。
- 物価の数字（指数・出典つきの金額）は、無料で使える自動更新元がないため、確認日つきで手動で更新する。
