import React from 'react'
import { ConnectButton } from "web3uikit";

const EvmNav = () => {
  return (
    <nav className='container'>
        <a className='primary' href='/'>EVM CCTP DEMO</a>
        <div className='links'>
            <ConnectButton />
        </div>      
    </nav>
  )
}

export default EvmNav