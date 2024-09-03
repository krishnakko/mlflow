import { Modal } from '@databricks/design-system';
import { useState, useEffect } from 'react'
import { FormattedMessage } from 'react-intl';
import { useSelector } from 'react-redux';
import { getLocalStorageItem } from '../../utils';
import { ReduxState } from '../../../src/redux-types';

export default function ModelVersionViewProductionize({ props }: any) {
  const { modelVersion } = props;
  const confirmationMessage = "This will host this model version for serving."
  const [runId, setRunId] = useState<string>("");
  const [confirmProductionize, setConfirmProductionize] = useState<boolean>(false);
  const [prodMessage, setProdMessage] = useState<string>(confirmationMessage);
  const [continueClicked, setContinueClicked] = useState<boolean>(false);
  const runInfosByUuid = useSelector(
    ({ entities }: ReduxState) => entities.runInfosByUuid,
  );


  useEffect(() => {
    if (modelVersion?.run_id) {
      setRunId(modelVersion.run_id);
    }
  }, [modelVersion])

  const startProductionize = () => {
    if (continueClicked) {
      onClickCancel()
    } else {
      setContinueClicked(true);
      const url: any = process.env['REACT_APP_MLFLOW_STATIC_PROXY_TARGET'];
      const projectId = getLocalStorageItem("displayProjectId")
      const expId = runInfosByUuid[runId]?.experimentId;
      const modelUrl = `${url}${projectId}/${expId}-${runId}`
      setProdMessage(`Once the hosting is complete, model can be accessed via url: ${modelUrl} `)
    }
  };

  const clickProductionize = (e: any, version: any) => {
    setConfirmProductionize(true);
  };

  const onClickCancel = () => {
    setConfirmProductionize(false);
    setProdMessage(confirmationMessage);
    setContinueClicked(false)
  }

  const renderPublishVersionToProduction = (version: any) => {
    return (
      <button
        className='productionizeButton'
        onClick={(e) => { clickProductionize(e, version) }}
      >
        Productionize
      </button>
    );
  }
  return (
    <div>
      <Modal
        visible={confirmProductionize}
        title={
          <FormattedMessage
            defaultMessage='Productionize'
            description='Model registry > Switcher for the new model registry UI containing aliases > disable confirmation modal title'
          />
        }
        okText={continueClicked ? 'OK' : 'Continue'}
        cancelText={continueClicked ? undefined : "Cancel"}
        onCancel={onClickCancel}
        onOk={() => {
          startProductionize();
        }}
      >
        <div>
          {prodMessage}
        </div>
      </Modal>
      {renderPublishVersionToProduction(modelVersion)}
    </div>
  )
}
