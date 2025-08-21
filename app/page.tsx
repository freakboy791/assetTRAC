import Image from "next/image";
import { FC } from "react";

const Home: FC = () => {
  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-screen p-8 sm:p-20">
      <main className="flex flex-col gap-8 items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="text-blue-600">assetTRAC 🚀</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl">
          Your lightweight IT asset management platform.  
          Secure. Scalable. Ready to grow with your business.
        </p>

        <div className="flex gap-4 mt-6">
          <a
            className="rounded-md border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm sm:text-base h-10 sm:h-12 px-6"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
          <a
            className="rounded-md border border-solid border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm sm:text-base h-10 sm:h-12 px-6"
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by Vercel
          </a>
        </div>
      </main>

      <footer className="mt-16 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-500">
        <a
          className="hover:underline hover:underline-offset-4"
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Supabase
        </a>
        <a
          className="hover:underline hover:underline-offset-4"
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Next.js Docs
        </a>
        <a
          className="hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vercel Templates
        </a>
      </footer>
    </div>
  );
};

export default Home;
