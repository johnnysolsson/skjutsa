import Calculator from "./components/Calculator";
import packageJson from "../package.json";

function App() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[80vh]">
      <div className="mb-6 text-center">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4 drop-shadow-lg pb-2">
          Skjutsa mig nu!
        </h1>
        <p className="text-gray-400 text-lg">
          Dela på bilresans kostnader enkelt och rättvist mellan förare och
          passagerare.
        </p>
      </div>

      <Calculator />

      <footer className="mt-16 text-gray-500 text-sm">
        <p>Skjutsa mig nu!</p>
        <p className="mb-4">v{packageJson.version}</p>
        <p>©{packageJson.author}</p>
        <p>2025</p>
      </footer>
    </div>
  );
}

export default App;
