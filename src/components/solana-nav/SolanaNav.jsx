import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import React from 'react'
import "./solana-nav.css"

const SolanaNav = () => {
  return (
    <nav className='container'>
        <a className='primary' href='/'>SOLANA CCTP DEMO</a>
        <div className='links'>
            <WalletMultiButton />
        </div>      
    </nav>
  )
}

export default SolanaNav