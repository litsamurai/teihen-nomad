# 底辺くんのノマドノート（このリポジトリの引き継ぎメモ）

スマホとPCなど、別々の会話から同じサイトを触るためのメモです。作業の前に必ず読んでください。

## 作業のルール（必須）
- **作業の前に `git pull --rebase origin main`。** 別の会話・GitHub Actionsも同じmainを更新します。
- 変更したら、確認してから `git push origin HEAD:main`。デプロイはGitHub Pages（push後、少し待つと反映）。
- 確認は、ローカルで `python3 -m http.server 8766` を立て、スマホ幅（320/375/390/430px）で、横はみ出しとタブのエラーを見る。
- データを変えたら `node tools/build-country-pages.js`（国別・街ページとsitemap.xmlを作り直す）。
- 新しい列・表が要るときは、`supabase/` にSQLを書いて、運営者（底辺くん）に実行してもらう。**秘密鍵（service_role、Discordのクライアントシークレット）は、絶対に受け取らない・要求しない。** 公開キー、GA4のID、Search Consoleの認証は公開してよい。

## サイトの方針（運営者が決めたこと）
- ブランド：ゆるい・だらだら。見出し「頑張らずに、世界で暮らす。」。YouTube赤×白、Discordは青紫、18禁と大人の同意書はピンク。
- **18禁・大人の同意書のタブは残す**（一般向けと分けなくてよい）。ただし、国別・街ページ（SEO用）のメニューには出さない。性的サービス（風俗等）の紹介は禁止。
- 広告・アフィリエイトのリンクには、**【PR】の表記を残す**。「運営者に報酬が入ります」のような説明文は、載せなくてよい。FX取引など、リスクの高い金融商品の広告は載せない。
- 編集・投稿は**ログインなしで誰でもできる**（Wikipedia方式、Supabaseの匿名ログイン）。称号・ポイントはDiscordログインした人だけ。交流はDiscordに集約。
- 未確認・AI概算のデータは、「概算（未検証）」と正直に書く。出典と確認日を残す。数字を推測で作らない。
- 安全の情報は、まじめに書く。運営者の手間は、なるべく少なく。

## しくみ
- `index.html`：サイト本体（1ファイル。HTML/CSS/JS）。CSSの上書きは、最後の`</style>`の直前に足す。タブは `TABS` と `tab()`。
- `data/*.json`：国・街・お店・ニュースなどのデータ。`country/` `city/` は自動生成。
- Supabase：profiles, countries, country_revisions, places, reviews, channels, stays, reports, promos, market。RLSで、自分の投稿だけ編集・削除可、管理人は全て。1時間10件の制限、通報3件で自動非表示。
- 実行済みのSQL：schema.sql, add-promo-market.sql, 管理人の設定, add-anon-flag.sql, add-map-collab.sql, add-stay-ratings.sql。
- Supabase Edge Function：`resolve-map`（supabase/functions/resolve-map/index.ts。Googleマップの短縮リンクを展開）。2026-11-12に運営者がSupabaseの画面でデプロイ済み。変更したら、運営者に再デプロイを頼む（秘密鍵は不要）。
- GitHub Actions：`news.yml`（日本時間7・12・19時にニュース。Yahoo!ニュース国際・BBC・Al Jazeera）、`monthly.yml`（毎月1日に為替とページ再生成）、`geocode.yml`（手動。お店の位置を調べる）。
- 公開サイトの確認（Claudeが自分でできる）：`gh workflow run live-check.yml --ref main -R litsamurai/teihen-nomad`（タブは `-f tabs=stays,food,home`）。公開中のサイトをスマホ幅(390px)で開き、スクショとエラーを `live-shots` ブランチに保存する。見るには `git fetch origin live-shots:refs/remotes/origin/live-shots` → `git worktree add --detach /tmp/ls origin/live-shots` → log.txt とPNGをReadする。この環境からは、サイトやSupabaseへ直接つながらないので、確認はこの方法を使う。運営者に確認作業を頼まない。
- 短縮リンク（宿の投稿）：`resolve-map` は非ブラウザ風のUA（`Mozilla/5.0 (compatible; nomad-note)`）でないとGoogleが展開しない。展開後は `?q=宿名, 住所`（座標なし）の形で、サイト側が住所から（St→Street、District/Cityを外して）OSMで場所を探す。
- 宿タブ：レビュー一覧は検索したときだけ表示。地図のピンのポップアップに平均★と「評価・メモを見る」ボタンがある。
- 毎月2日に、ClaudeがコストデータをWebで確認して更新する予定タスクがある。
- 外部：OpenStreetMap/Leaflet（地図）、Nominatim（場所検索）、rss2json・MyMemory（ニュースの予備）、ExchangeRate-API（為替）。

## いまの状態・やること
- 提携待ち：Wise（Partnerize）、A8のVPN案件。承認されたらリンクを「準備」タブ等に【PR】つきで入れる。入れ済み：楽天、Agoda、VOYE（eSIM）、スイカVPN。
- 検索（SEO）の状態（2026-11-12）：Search Console登録済み（URLプレフィックス、確認ファイル google0774770f902fff56.html）。トップページはGoogleに登録済み。国別ページ（例 country/th.html）は未認識。サイトマップ（sitemap.xml、254URL）は送信済みだが「取得できませんでした」表示（新サイトでよくある。サイトのsitemap.xml自体は正常に公開されている。入力欄は固定の前置きがあるので `sitemap.xml` だけ入れる）。数日後に再確認し、変わらなければ配信形式を調べる。検索に出るには数日〜数週間かかる。
- 次にやること（SEO）：数日後に `site:litsamurai.github.io/teihen-nomad` で確認／国別ページの見出し・本文を「◯◯ 生活費」「◯◯ ノマド」で探されやすく磨く／YouTube概要欄・X・Discordからリンクを貼る／独自ドメインは検討中。
- 未対応：GA4（測定IDをもらったら導入＋privacy.html更新）、OGP画像（見出しの黄色い囲みを直す）、宿・マーケット・PRの最初の投稿（運営者が入れる）。
- 保留：旅人マップ（市区町村単位・本人の許可・自動で消える）、広告（アクセスが増えてから）。
