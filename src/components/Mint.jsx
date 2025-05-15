import axios from "axios"
import { BigNumber, ethers } from "ethers"
import React, { Fragment, useContext, useState, useEffect } from "react"
import ethereumIcon from "/ui/mint/ethereum.png"
import mintPopupImage from "/ui/mint/mintPopup.png"
import { createAvatarWithBio } from "../library/utils"
import { SceneContext } from "../context/SceneContext"
import { getCroppedScreenshot } from "../library/utils"
import { CharacterContract, EternalProxyContract, webaverseGenesisAddress } from "./Contract"
import { getGLBBlobData } from "../library/download-utils"
import styles from "./Mint.module.css"

const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY
const pinataSecretApiKey = import.meta.env.VITE_PINATA_API_SECRET

const mintCost = 0.01

export default function MintPopup({screenshotPosition, bioData}) {
  const { avatar, model, templateInfo } = useContext(SceneContext)
  const [mintStatus, setMintStatus] = useState("")
  const [tokenPrice, setTokenPrice] = useState(null);
  const chainId = "0x89";

  useEffect(() => {
    ( async () => {
        const defaultProvider = new ethers.providers.StaticJsonRpcProvider('https://polygon-rpc.com/')
        const contract = new ethers.Contract(CharacterContract.address, CharacterContract.abi, defaultProvider)

        const tp = await contract.tokenPrice()
        setTokenPrice( BigNumber.from(tp).mul(1) )
    })();
  }, [])

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const chain = await window.ethereum.request({ method: 'eth_chainId' })
        if (Number.parseInt(chain, 16) === Number.parseInt(chainId, 16)) {
          const addressArray = await window.ethereum.request({
            method: 'eth_requestAccounts',
          })
          return addressArray.length > 0 ? addressArray[0] : ""
        }
        window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainId }],
        })
        const addressArray = await window.ethereum.request({
          method: 'eth_requestAccounts',
        })
        return addressArray.length > 0 ? addressArray[0] : ""
      } catch (err) {
        return "";
      }
    } else {
      return "";
    }
  }

  async function saveFileToPinata(fileData, fileName) {
    if (!fileData) return console.warn("Error saving to pinata: No file data")
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
    const data = new FormData()

    data.append("file", fileData, fileName)
    const resultOfUpload = await axios.post(url, data, {
      maxContentLength: "Infinity", //this is needed to prevent axios from erroring out with large files
      maxBodyLength: "Infinity", //this is needed to prevent axios from erroring out with large files
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey,
      },
    })
    return resultOfUpload.data
  }

  const getAvatarTraits = () => {
    const metadataTraits = []
    Object.keys(avatar).map((trait) => {
      if (Object.keys(avatar[trait]).length !== 0) {
        metadataTraits.push({
          trait_type: trait,
          value: avatar[trait].name,
        })
      }
    })
    return metadataTraits
  }

  const mintAsset = async () => {
    let walletAddress = await connectWallet()

    const pass = await checkOT(walletAddress);
    if(pass) {
      setMintStatus("Uploading...")
      let imageHash;
      let glbHash;

      // Create avatar with bio snapshot
      const avatarElement = document.getElementById('editor-scene');
      const { traits = {}, fullBio = "" } = bioData || {};
      const bio = fullBio || Object.entries(traits)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n\n');
      const imageData = await createAvatarWithBio(avatarElement, bio);
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      let imageName = `AvatarWithBio_${Date.now()}.png`;
      if (blob) {
        const formData = new FormData();
        formData.append("file", blob, imageName);
        
        try {
          const res = await axios.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey
              }
            }
          );
          imageHash = res.data.IpfsHash;
        } catch (err) {
          console.error(err);
          setMintStatus("Error uploading image");
          return;
        }
      }

      const glb = await getGLBBlobData(model)
      if (glb) {
        let glbName = `AvatarGlb_${Date.now()}.glb`;
        glbHash = await (async() => {
          for (let i = 0; i < 10; i++) { // hack: give it a few tries, sometimes uploading to pinata fail for some reason
            try {
              const glb_hash = await saveFileToPinata(
                glb,
                glbName
              ).catch((reason) => {
                console.error(i, "---", reason)
                setMintStatus("Couldn't save glb to pinata")
              })
              return glb_hash
            } catch(err) {
              console.warn(err);
            }
          }
          throw new Error('failed to upload glb');
        })();
      } else {
        throw new Error("Unable to get glb")
      }

      const attributes = getAvatarTraits()
      const metadata = {
        name: "Avatars",
        description: "Character Studio Avatars.",
        image: `ipfs://${imageHash}`,
        animation_url: `ipfs://${glbHash.IpfsHash}`,
        attributes: attributes
      }
      const str = JSON.stringify(metadata)
      const metaDataHash = await saveFileToPinata(
        new Blob([str]),
        `AvatarMetadata_${Date.now()}.json`,
      )
      const metadataIpfs = `ipfs://${metaDataHash.IpfsHash}`

      setMintStatus("Minting...")
      const signer = new ethers.providers.Web3Provider(
        window.ethereum,
      ).getSigner()
      const contract = new ethers.Contract(CharacterContract.address, CharacterContract.abi, signer)
      try {
        const options = {
          value: tokenPrice,
          from: walletAddress
        }
        const tx = await contract.mintToken(1, metadataIpfs, options)
        let res = await tx.wait()
        if (res.transactionHash) {
          setMintStatus("Mint success!")
        }
      } catch (err) {
        setMintStatus("Public Mint failed! Please check your wallet.")
      }
    } else {
      return;
    }
  }

  const  takeScreenshot = async () => {
    const img = await getCroppedScreenshot("editor-scene",screenshotPosition.x, screenshotPosition.y, screenshotPosition.width, screenshotPosition.height, true)
    const glb = await getGLBBlobData(model)
  }

  const checkOT = async (address) => {
    if(address) {
      const address = '0x6e58309CD851A5B124E3A56768a42d12f3B6D104'
      const ethersigner = ethers.getDefaultProvider("mainnet", {
        alchemy: import.meta.env.VITE_ALCHEMY_API_KEY,
      })
      const contract = new ethers.Contract(EternalProxyContract.address, EternalProxyContract.abi, ethersigner);
      const webaBalance = await contract.beneficiaryBalanceOf(address, webaverseGenesisAddress, 1);
      if(Number.parseInt(webaBalance) > 0) return true;
      setMintStatus("Currently in alpha. You need a genesis pass to mint.\nWill be public soon!")
      return false;
    }
    setMintStatus("Please connect your wallet")
    return false;
  }

  const showTrait = (trait) => {
    if (trait.name in avatar) {
      if ("traitInfo" in avatar[trait.name]) {
        return avatar[trait.name].name
      }
      return `Default ${trait.name}`
    }
    return "No set"
  }

  return (
    // currentView.includes("MINT") && (
      <div className={styles.StyledContainer}>
        <div className={styles.StyledPopup}>
          {/* {connected && ( */}
            <Fragment>
              <div className={styles.Header}>
                <img
                  src={mintPopupImage}
                  alt="Mint status indicator"
                  className={mintStatus}
                  height={"50px"}
                />
                <div className={styles.mintTitle}>Mint Avatar</div>
              </div>
              <div className={styles.TraitDetail}>
                {templateInfo?.traits?.map((item) => (
                  <div className={styles.TraitBox} key={item.name}>
                    <div className={styles.TraitImage} />
                    <img src={templateInfo?.traitIconsDirectory + item?.icon} alt={`${item?.name || 'Character'} trait icon`} />
                    <div className={styles.TraitText}>{showTrait(item)}</div>
                  </div>
                ))}
              </div>
              <div className={styles.MintPriceBox}>
                <div className={styles.MintCost}>
                  {"Mint Price: "}
                </div>
                <div className={styles.TraitImage} />
                <img src={ethereumIcon} height={"40%"} alt="Ethereum icon" />
                <div className={styles.MintCost}>
                  &nbsp;{mintCost}
                </div>
              </div>
              <div className={styles.Title} fontSize={"1rem"}>
                {mintStatus}
              </div>
              <div className={styles.ButtonPanel}>
                <button
                  type="button"
                  className={styles.StyledButton}
                  onClick={() => mintAsset()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      mintAsset();
                    }
                  }}
                >
                  Mint
                </button>
              </div>
            </Fragment>
          {/* )} */}
        </div>
      </div>
    // )
  )
}
