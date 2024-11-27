// pages/_app.js
import "../app/globals.css"; // 글로벌 CSS 파일
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
