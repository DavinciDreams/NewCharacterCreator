import React, { useContext } from "react"
import { SceneContext } from "../context/SceneContext"
import CustomButton from "./custom-button"
import { downloadGLB, downloadVRM } from "../library/download-utils"
import { BioContext } from "../context/BioContext"
import { LanguageContext } from "../context/LanguageContext"

import styles from "./ExportMenu.module.css"

export default function ExportMenu({ name = "" }) {
  // Translate hook
  const { t } = useContext(LanguageContext);
  const { model, avatar } = useContext(SceneContext)
  const { bioData } = useContext(BioContext)
  
  return (
    <div className={styles.container}>
      <CustomButton
        theme="light"
        text="GLB"
        icon="download"
        size={14}
        className={styles.button}
        onClick={() => {
          downloadGLB(model, true, name, 4096, bioData)
        }}
      />
      <CustomButton
        theme="light"
        text={`GLB (${t('text.unoptimized')})`}
        icon="download"
        size={14}
        className={styles.button}
        onClick={() => {
          downloadGLB(model, false, name, 4096, bioData)
        }}
      />
      <CustomButton
        theme="light"
        text="VRM"
        icon="download"
        size={14}
        className={styles.button}
        onClick={() => {
          downloadVRM(model, avatar, name, 4096, true, bioData)
        }}
      />
    </div>
  )
}
