import React, { useState} from 'react'
import { EvmNav } from "../index";
import "./evm.css"
import { MoralisProvider } from "react-moralis"
import { decode } from "bs58";
import { eth, utils } from "web3";
// import AbiCoder to use ethers instead of web3.js to decode receipt data
import { Contract, BrowserProvider, getBytes, } from "ethers";
import { PublicKey } from "@solana/web3.js";

import { TOKEN_MESSENGER_ADDRESS_AVALANCHE, USDC_ADDRESS_AVALANCHE, MESSAGE_TRANSMITTER_ADDRESS_AVALANCHE } from "../../utils/addresses/avalanche/avalanche"
import token_messenger_abi_avalanche from "../../utils/abis/avalanche/token_messenger.json";
import usdc_contract_abi_avalanche from "../../utils/abis/avalanche/usdc.json"
import messenger_abi_avalanche from "../../utils/abis/avalanche/message_transmitter.json"

import { TOKEN_MESSENGER_ADDRESS_ETHEREUM, USDC_ADDRESS_ETHEREUM, MESSAGE_TRANSMITTER_ADDRESS_ETHEREUM } from "../../utils/addresses/ethereum/ethereum"
import token_messenger_abi_ethereum from "../../utils/abis/ethereum/token_messenger.json"
import usdc_contract_abi_ethereum from "../../utils/abis/ethereum/usdc.json"
import messenger_abi_ethereum from "../../utils/abis/ethereum/message_transmitter.json"

const EvmComponent = () => {
  //const { chainId, account }= useMoralis();
  const [sourceChain, setSourceChain] = useState('');  
  const [sourceChain2, setSourceChain2] = useState('');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState(0);

  const [isReceiveDisabled, setIsReceiveDisabled] = useState(false);
  const [isSendComplete, setIsSendComplete] = useState(false);

  const [attestationReceive, setAttestationReceive] = useState('');
  const [messageBytesReceive, setMessageBytesReceive] = useState('');

  const [attestationSend, setAttestationSend] = useState('');
  const [messageBytesSend, setMessageBytesSend] = useState('');
  
  const destinationChainID = 5;

  const handleSend = async () => {
    setIsSendComplete(false)

    const usdc_address = sourceChain === 'ethereum' ? USDC_ADDRESS_ETHEREUM : USDC_ADDRESS_AVALANCHE;
    const usdc_abi =  sourceChain === 'ethereum' ? usdc_contract_abi_ethereum : usdc_contract_abi_avalanche;
    const token_messenger_address =  sourceChain === 'ethereum' ? TOKEN_MESSENGER_ADDRESS_ETHEREUM : TOKEN_MESSENGER_ADDRESS_AVALANCHE;
    const token_messenger_abi =  sourceChain === 'ethereum' ? token_messenger_abi_ethereum : token_messenger_abi_avalanche;

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const usdc_contract = new Contract(usdc_address, usdc_abi, signer);
    const token_messenger_contract = new Contract(token_messenger_address, token_messenger_abi, signer); 

    
    
    try {   
      const approveTx = await usdc_contract.approve(token_messenger_address, amount);
      // const approveTxReceipt = await approveTx.wait(1);
      // console.log(approveTxReceipt)

      const destinationAddressInBytes32 = decode(address).slice(0, 32);
      
      //const reducedAddressHex = Buffer.from(destinationAddressInBytes32).toString('hex');
      
      const burnTx = await token_messenger_contract.depositForBurn(amount, destinationChainID, destinationAddressInBytes32, usdc_address)
      const burnTxReceipt = await burnTx.wait()
      const burnTxHash = burnTx.hash

      const eventTopic = utils.keccak256('MessageSent(bytes)')
      const log = burnTxReceipt.logs.find((l) => l.topics[0] === eventTopic)
      const messageBytes = eth.abi.decodeParameters(['bytes'], log?.data)[0]
      const messageHash = utils.keccak256(messageBytes);

      const response = await fetch(`https://iris-api-sandbox.circle.com/attestations/${messageHash}`);
      const attestationResponse = await response.json()

      setMessageBytesSend(messageBytes)
      setAttestationSend(attestationResponse.attestation)
      console.log("done 1")


    } catch (e) {
      console.log(e)
    }

   

    /** using ethers.js
     * const burnTxReceipt = await burnTx.wait()
     *  const log = burnTxReceipt.logs.find((l: any) => l.topics[0] === eventTopic);
      const messageBytes = new AbiCoder.decode(["bytes"],log.data)[0];
      const messageHash = keccak256(messageBytes);
     */ 
  }

  const handleReceive = async () => {
    setIsReceiveDisabled(true)
    const messenger_abi = sourceChain2 === 'ethereum' ? messenger_abi_ethereum : messenger_abi_avalanche;
    const messenger_address = sourceChain2 === 'ethereum' ? MESSAGE_TRANSMITTER_ADDRESS_ETHEREUM : MESSAGE_TRANSMITTER_ADDRESS_AVALANCHE;

    const provider = new BrowserProvider(window.ethereum);
    const signer = provider.getSigner();

    const message_transmitter = new Contract(messenger_address, messenger_abi, signer);
    const receiveTx = await message_transmitter.receiveMessage(messageBytesReceive, attestationReceive);

    const receiveTxReceipt = receiveTx.wait()

    if(receiveTxReceipt) setIsReceiveDisabled(false)
  }

  const handleSelectChange = (event) => {
    setSourceChain(event.target.value)
  }

  const handleSelectChange2 = (event) => {
    setSourceChain2(event.target.value)
  }

  const handleAddress = (event) => {
    setAddress(event.target.value)
  }

  const handleAmount = (event) => {
    setAmount(event.target.value)
  }

  const handleAttestation = (event) => {
    setAttestationReceive(event.target.value)
  }

  const handleMessageBytes = (event) => {
    setMessageBytesReceive(event.target.value)
  }

  return (
    <MoralisProvider initializeOnMount={false}>
        <EvmNav />
        <section>
          <span className='sub-section'>
            <div className='solana-tab'>
              <header>Send USDC</header>
              <div>
                <form>
                  <div>
                    <div>
                      <label>Source Chain:</label>
                      <select onChange={handleSelectChange}>
                        <option value='ethereum'>Ethereum</option>
                        <option value='avalanche'>Avalanche</option>
                      </select>
                    </div>
                    <label>Destination Chain:</label>
                    <input type='text' defaultValue='Solana' name='destAddress' />
                  </div>
                  <div>
                    <label>Address:</label>
                    <input type='text' placeholder='Enter address' name='destAddress' onChange={handleAddress} />
                  </div>
                  <div>
                    <label>Amount:</label>
                    <input type='number' placeholder='Enter amount' name='amount' onChange={handleAmount} />
                  </div>
                </form>
                <button onClick={handleSend}>SEND</button>
              </div>
              {
                isSendComplete ? (
                  <div></div>
                ) : (
                  <div className='send-results'>
                    <div>{`Message bytes : ${messageBytesSend}`}</div>
                    <div>{`Attestation : ${attestationSend}`}</div>
                  </div> 
                )
              }
            </div>
            <div className='evm-tab'>
                <header>Receive USDC</header>
                <div>
                  <form>
                    <div>
                      <label>Message bytes:</label>
                      <input type='text' placeholder='Enter message bytes ' name='messageBytes' onChange={handleMessageBytes} />
                    </div>
                    <div>
                      <label>Attestation Hash:</label>
                      <input type='text' placeholder='Enter message attestation' name='messageAttestation' onChange={handleAttestation} />
                    </div>
                    <div>
                      <label>Source Chain:</label>
                      <select onChange={handleSelectChange2}>
                        <option value='ethereum'>Ethereum</option>
                        <option value='avalanche'>Avalanche</option>
                      </select>
                    </div>
                  </form>
                  {
                    isReceiveDisabled ? (
                      <button onClick={handleReceive} disabled >RECEIVE</button>
                    ) : (
                      <button onClick={handleReceive}>RECEIVE</button>
                    )
                  } 
                </div>
            </div>
          </span>
        </section>
    </MoralisProvider>
  )
}

export default EvmComponent