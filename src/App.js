import './App.css';
import { Route, Routes, BrowserRouter } from "react-router-dom";
import { Home, SolanaComponent, EvmComponent } from "../src/components/index";

function App() {
  return (
    <div className='page'>
      <BrowserRouter>      
        <Routes>
          <Route path='/' exact element={<Home />}/>
          <Route path='/solana-cctp' exact element={<SolanaComponent />}/>
          <Route path='/evm-cctp' exact element={<EvmComponent />}/>
        </Routes>
      </BrowserRouter>
    </div>
    
    
    
  );
}

export default App;
