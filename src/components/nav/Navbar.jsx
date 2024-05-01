import React from 'react'
import { useNavigate } from "react-router-dom";
import "./navbar.css"

const Navbar = () => {
    const navigate = useNavigate()
  return (
    <nav className='container'>
        <a className='primary' href='/'>CCTP-DEMO</a>
        <div className='links'>
            <a href='/solana-cctp'>SOLANA</a>
            <a href='/evm-cctp'>EVM</a>
        </div>
            
    </nav>
  )
}

export default Navbar