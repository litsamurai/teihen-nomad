# teihen-nomad
## 国別ページ（検索用）の更新
`data/countries.json` を直したら、次を実行して、`country/` と `sitemap.xml` をコミットします。
```
node tools/build-country-pages.js
```
検索に載せるのは、出典で確認できた国だけです（概算のみの国は noindex）。
