import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
      <>
        <Head>
            <link rel="icon" href="/thumb_47l_icon.ico" />
        </Head>
        <header>
            <Navbar />
        </header>
        <Component {...pageProps} />
        <Footer />
      </>
  );
}
