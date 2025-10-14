import { useState } from "react";
import reactLogo from "../../assets/react.svg";
import viteLogo from "/vite.svg";

const Example: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center justify-center p-6">
      {/* Logos */}
      <div className="flex items-center justify-center gap-12 mb-10">
        <a
          href="https://vite.dev"
          target="_blank"
          className="transition-transform hover:scale-110"
        >
          <img
            src={viteLogo}
            className="w-24 h-24 drop-shadow-[0_0_1rem_#646cffaa]"
            alt="Vite logo"
          />
        </a>
        <a
          href="https://react.dev"
          target="_blank"
          className="transition-transform hover:scale-110"
        >
          <img
            src={reactLogo}
            className="w-24 h-24 drop-shadow-[0_0_1rem_#61dafbaa]"
            alt="React logo"
          />
        </a>
      </div>

      {/* Título */}
      <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        Vite + React
      </h1>

      {/* Card principal */}
      <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-2xl shadow-lg p-8 text-center max-w-md">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-transform hover:scale-105 shadow-md"
        >
          count is {count}
        </button>

        <p className="mt-4 text-gray-300">
          Edit{" "}
          <code className="bg-gray-700 px-2 py-1 rounded text-sm">
            src/App.tsx
          </code>{" "}
          and save to test HMR
        </p>
      </div>

      {/* Rodapé */}
      <p className="mt-8 text-gray-400 text-sm italic">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
};

export default Example;
