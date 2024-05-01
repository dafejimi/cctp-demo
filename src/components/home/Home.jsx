import React from 'react'
import { Navbar } from "../index";
import "./home.css"

const Home = () => {
  return (
    <div>
        <Navbar />
        <div className='main-section'>
            <section>
                <h2>Simple Dapp for Cross chain USDC transfers</h2>
                <p className='intro-paragraph'>
                    Cross-Chain Transfer Protocol (CCTP) is a permissionless on-chain utility that facilitates USDC transfers securely between blockchains networks via native burning and minting. 
                    Circle created it to improve capital efficiency and minimize trust requirements when using USDC across blockchain networks. CCTP enables developers to build multi-chain applications that provide secure, 
                    1:1 transfers of USDC across blockchains for their users.
                </p>
                <span className='sub-section'>
                    <div className='solana-tab'>
                        <header>Start a transaction on solana</header>
                        <p></p>
                        <a href='solana-cctp'>Click here to proceed</a>
                    </div>
                    <div className='evm-tab'>
                        <header>Start a transaction on any EVM chain</header>
                        <p></p>
                        <a href='/evm-cctp'>Click here to proceed</a>
                    </div>
                </span>
            </section>
        </div>
    </div>
    
  )
}

export default Home