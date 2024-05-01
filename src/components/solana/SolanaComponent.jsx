import React, {useState} from 'react'
import { getBytes, getAddress, hexlify, getBigInt } from "ethers";
import { SolanaNav, Context } from "../index";
import  { TOKEN_PROGRAM_ID} from "@solana/spl-token";
import { AnchorProvider, BN, Program, utils, setProvider } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import "./solana.css"

import { USDC_ADDRESS, MESSAGE_TRANSMITTER_ADDRESS, TOKEN_MESSENGER_ADDRESS} from "../../utils/addresses/solana/solana"
import { USDC_ADDRESS_ETHEREUM } from "../../utils/addresses/ethereum/ethereum";
import { USDC_ADDRESS_AVALANCHE } from "../../utils/addresses/avalanche/avalanche";
import token_messenger_idl from "../../utils/abis/solana/token_messenger.json"
import messenger_idl from "../../utils/abis/solana/message_transmitter.json"

const SolanaComponent = () => {
  const [selectedChain, setSelectedChain] = useState("")
  const [selectedChain2, setSelectedChain2] = useState("")
  const [destinationChainID, setDestinationChainID] = useState("")
  const [sourceChainID, setSourceChainID] = useState('')
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')

  const [isReceiveDisabled, setIsReceiveDisabled] = useState(false)
  const [isSendComplete, setIsSendComplete] = useState(false)


  const [attestationReceive, setAttestationReceive] = useState('')
  const [messageBytesReceive, setMessageBytesReceive] = useState('')

  const [attestationSend, setAttestationSend] = useState('')
  const [messageBytesSend, setMessageBytesSend] = useState('')

  const getAnchorConnection = () => {
    const provider = new AnchorProvider(connection, wallet)
    setProvider(provider); 
    return provider;
  };

  const wallet = useAnchorWallet();
  const connection = useConnection()
  const provider = getAnchorConnection();
  const usdcAddress = new PublicKey(USDC_ADDRESS)
  const token_contract_pk = new PublicKey(TOKEN_MESSENGER_ADDRESS)
  const messenger_contract_pk = new PublicKey(MESSAGE_TRANSMITTER_ADDRESS)

  const hexToBytes = (hex) => Buffer.from(hex.replace("0x", ""), "hex");
  const evmAddressToBytes32 = (address)=> `0x000000000000000000000000${address.replace("0x", "")}`;

  const decodeEventNonceFromMessage = (messageHex) => {
    const nonceIndex = 12;
    const nonceBytesLength = 8;
    const message = hexToBytes(messageHex);
    const eventNonceBytes = message.subarray(nonceIndex, nonceIndex + nonceBytesLength);
    const eventNonceHex = hexlify(eventNonceBytes);
    return getBigInt(eventNonceHex).toString();
  }

  const getProgram = (IDL, PROGRAM_ID) => {
    if (connection) {
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      const program = new Program(IDL, PROGRAM_ID, provider);
      return program;
    }
  }

  const findProgramAddress = (label, programId, extraSeeds) => {
    const seeds = [Buffer.from(utils.bytes.utf8.encode(label))];
    if (extraSeeds) {
      for (const extraSeed of extraSeeds) {
        if (typeof extraSeed === "string") {
          seeds.push(Buffer.from(utils.bytes.utf8.encode(extraSeed)));
        } else if (Array.isArray(extraSeed)) {
          seeds.push(Buffer.from(extraSeed ));
        } else if (Buffer.isBuffer(extraSeed)) {
          seeds.push(extraSeed);
        } else {
          seeds.push(extraSeed.toBuffer());
        }
      }
    }
    const res = PublicKey.findProgramAddressSync(seeds, programId);
    return { publicKey: res[0], bump: res[1] };
  };

  const getDepositForBurnPdas = (messageTransmitterProgramID, tokenMessengerMinterProgramID, usdcAddress, destinationDomain) => {
    const messageTransmitterAccount = findProgramAddress("message_transmitter", messageTransmitterProgramID);
    const tokenMessengerAccount = findProgramAddress("token_messenger", tokenMessengerMinterProgramID);
    const tokenMinterAccount = findProgramAddress("token_minter", tokenMessengerMinterProgramID);
    const localToken = findProgramAddress("local_token", tokenMessengerMinterProgramID, [usdcAddress]);
    const remoteTokenMessengerKey = findProgramAddress("remote_token_messenger", tokenMessengerMinterProgramID, [
        destinationDomain.toString(),
    ]);
    const authorityPda = findProgramAddress("sender_authority", tokenMessengerMinterProgramID);

    return {
        messageTransmitterAccount,
        tokenMessengerAccount,
        tokenMinterAccount,
        localToken,
        remoteTokenMessengerKey,
        authorityPda
    }
  }

  const getReceiveMessagePdas = async (messageTransmitterProgramID, tokenMessengerMinterProgramID, solUsdcAddress, remoteUsdcAddressHex, remoteDomain, nonce) => {
    const tokenMessengerAccount = findProgramAddress("token_messenger", tokenMessengerMinterProgramID);
    const messageTransmitterAccount = findProgramAddress("message_transmitter", messageTransmitterProgramID);
    const tokenMinterAccount = findProgramAddress("token_minter", tokenMessengerMinterProgramID);
    const localToken = findProgramAddress("local_token", tokenMessengerMinterProgramID, [solUsdcAddress]);
    const remoteTokenMessengerKey = findProgramAddress("remote_token_messenger", tokenMessengerMinterProgramID, [remoteDomain]);
    const remoteTokenKey = new PublicKey(hexToBytes(remoteUsdcAddressHex));
    const tokenPair = findProgramAddress("token_pair", tokenMessengerMinterProgramID, [
        remoteDomain,
        remoteTokenKey,
    ]);
    const custodyTokenAccount = findProgramAddress("custody", tokenMessengerMinterProgramID, [
        solUsdcAddress,
    ]);
    const authorityPda = findProgramAddress(
        "message_transmitter_authority",
        messageTransmitterProgramID,
        [tokenMessengerMinterProgramID]
    ).publicKey;
    const tokenMessengerEventAuthority = findProgramAddress("__event_authority", tokenMessengerMinterProgramID);

    const usedNonces = getProgram(messenger_idl, MESSAGE_TRANSMITTER_ADDRESS).methods
    .getNoncePda({
      nonce: new BN(nonce), 
      sourceDomain: Number(remoteDomain)
    })
    .accounts({
      messageTransmitter: messageTransmitterAccount.publicKey
    })
    .view();

    return {
        messageTransmitterAccount,
        tokenMessengerAccount,
        tokenMinterAccount,
        localToken,
        remoteTokenMessengerKey,
        remoteTokenKey,
        tokenPair,
        custodyTokenAccount,
        authorityPda,
        tokenMessengerEventAuthority,
        usedNonces
    }
  }

  const handleSend = async () => {
    setIsSendComplete(false)

    try {
      const destinationDomain = Number(destinationChainID);
      const pdas = getDepositForBurnPdas(messenger_contract_pk, token_contract_pk, usdcAddress, destinationDomain);
      const token_messenger = getProgram(token_messenger_idl, TOKEN_MESSENGER_ADDRESS)

      const messageSentEventAccountKeypair = Keypair.generate();

      const amount_formatted = new BN(amount * 1000000);
      const mintRecipient = new PublicKey(getBytes(evmAddressToBytes32(address)));

      const depositForBurnTx = await token_messenger.methods
      .depositForBurn({
          amount_formatted,
          destinationDomain,
          mintRecipient,
      })
      // eventAuthority and program accounts are implicitly added by Anchor 
      .accounts({
          owner: provider.wallet.publicKey,
          eventRentPayer: provider.wallet.publicKey,
          senderAuthorityPda: pdas.authorityPda.publicKey,
          burnTokenAccount: wallet.publicKey,
          messageTransmitter: pdas.messageTransmitterAccount.publicKey,
          tokenMessenger: pdas.tokenMessengerAccount.publicKey,
          remoteTokenMessenger: pdas.remoteTokenMessengerKey.publicKey,
          tokenMinter: pdas.tokenMinterAccount.publicKey,
          localToken: pdas.localToken.publicKey,
          burnTokenMint: usdcAddress,
          messageTransmitterProgram: messenger_contract_pk,
          tokenMessengerMinterProgram: token_contract_pk,
          messageSentEventData: messageSentEventAccountKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
      })
      // messageSentEventAccountKeypair must be a signer so the MessageTransmitter program can take control of it and write to it.
      // provider.wallet is also an implicit signer
      .signers([messageSentEventAccountKeypair])
      .rpc();

      const response = await fetch(`https://iris-api-sandbox.circle.com/messages/5/${depositForBurnTx}`);
      const attestationResponse = await response.json()

      setMessageBytesSend(attestationResponse.messages[0].message)
      setAttestationSend(attestationResponse.messages[0].attestation)

    } catch (error) {
      console.log(error)      
    }

    

    
    setIsSendComplete(true)
  }

  const handleReceive = async () => {
    setIsReceiveDisabled(true)

    const remoteTokenAddress = selectedChain === 'ethereum' ? USDC_ADDRESS_ETHEREUM : USDC_ADDRESS_AVALANCHE
    const remoteTokenAddressHex = getAddress(remoteTokenAddress)
    const remoteDomain = Number(sourceChainID)
    const nonce = decodeEventNonceFromMessage(hexlify(messageBytesReceive))

    const pdas = await getReceiveMessagePdas(messenger_contract_pk, token_contract_pk, usdcAddress, remoteTokenAddressHex, remoteDomain, nonce)

    const accountMetas = [];
    accountMetas.push({
        isSigner: false,
        isWritable: false,
        pubkey: pdas.tokenMessengerAccount.publicKey,
    });
    accountMetas.push({
        isSigner: false,
        isWritable: false,
        pubkey: pdas.remoteTokenMessengerKey.publicKey,
    });
    accountMetas.push({
        isSigner: false,
        isWritable: true,
        pubkey: pdas.tokenMinterAccount.publicKey,
    });
    accountMetas.push({
        isSigner: false,
        isWritable: true,
        pubkey: pdas.localToken.publicKey,
    });
    accountMetas.push({
        isSigner: false,
        isWritable: false,
        pubkey: pdas.tokenPair.publicKey,
    });
    accountMetas.push({
        isSigner: false,
        isWritable: true,
        pubkey: wallet.publicKey,
    });
    accountMetas.push({
        isSigner: false,
        isWritable: true,
        pubkey: pdas.custodyTokenAccount.publicKey,
    });
    accountMetas.push({
        isSigner: false,
        isWritable: false,
        pubkey: TOKEN_PROGRAM_ID,
    });
    accountMetas.push({
      isSigner: false,
      isWritable: false,
      pubkey: pdas.tokenMessengerEventAuthority.publicKey,
    });
    accountMetas.push({
      isSigner: false,
      isWritable: false,
      pubkey: token_contract_pk,
    });

    const messenger_contract = getProgram(messenger_idl, MESSAGE_TRANSMITTER_ADDRESS);

    const receiveMessageTx = await messenger_contract.methods
      .receiveMessage({
          message: Buffer.from(messageBytesReceive.replace("0x", ""), "hex"),
          attestation: Buffer.from(attestationReceive.replace("0x", ""), "hex"),
      })
      .accounts({
          payer: provider.wallet.publicKey,
          caller: provider.wallet.publicKey,
          authorityPda: pdas.authorityPda,
          messageTransmitter: pdas.messageTransmitterAccount.publicKey,
          usedNonces: pdas.usedNonces,
          receiver: token_contract_pk,
          systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(accountMetas)
      .rpc();
      
      if (receiveMessageTx) setIsReceiveDisabled(false)
  }

  const handleSelectChange = (event) => {
    setSelectedChain(event.target.value);
    if (selectedChain === 'ethereum') {setDestinationChainID(0)}
    if (selectedChain === 'avalanche') {setDestinationChainID(1)}

  };

  const handleSelectChange2 = (event) => {
    setSelectedChain2(event.target.value)

    if (selectedChain2 === 'ethereum') {setSourceChainID(0)}
    if (selectedChain2 === 'avalanche') {setSourceChainID(1)}    
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
    <Context>
        <SolanaNav />
        <section>
          <span className='sub-section'>
              <div className='solana-tab'>
                <header>Send USDC</header>
                <div className='form-content'>
                  <form>
                    <div>
                      <label>Destination Chain:</label>
                      <select className='select-options' onChange={handleSelectChange}>
                        <option value='ethereum'>Ethereum</option>
                        <option value='avalanche'>Avalanche</option>
                      </select>
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
        
    </Context>

  )
}

export default SolanaComponent