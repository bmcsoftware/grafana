import React, { useState } from 'react';

import { DataFrame, DataLink, VariableSuggestion } from '@grafana/data';

import { Trans } from '../../../utils/i18n';
import { Button } from '../../Button';
import { Modal } from '../../Modal/Modal';
import { DataLinkEditor } from '../DataLinkEditor';

interface DataLinkEditorModalContentProps {
  link: DataLink;
  index: number;
  data: DataFrame[];
  getSuggestions: () => VariableSuggestion[];
  onSave: (index: number, ink: DataLink) => void;
  onCancel: (index: number) => void;
}

export const DataLinkEditorModalContent = ({
  link,
  index,
  getSuggestions,
  onSave,
  onCancel,
}: DataLinkEditorModalContentProps) => {
  const [dirtyLink, setDirtyLink] = useState(link);
  return (
    <>
      <DataLinkEditor
        value={dirtyLink}
        index={index}
        isLast={false}
        suggestions={getSuggestions()}
        onChange={(index, link) => {
          setDirtyLink(link);
        }}
      />
      <Modal.ButtonRow>
        <Button variant="secondary" onClick={() => onCancel(index)} fill="outline">
          {/*BMC Change: To enable localization for below text*/}
          <Trans i18nKey="bmc.common.cancel">Cancel</Trans>
          {/* BMC Change ends */}
        </Button>
        <Button
          onClick={() => {
            onSave(index, dirtyLink);
          }}
        >
          {/*BMC Change: To enable localization for below text*/}
          <Trans i18nKey="bmc.calc-fields.save">Save</Trans>
          {/* BMC Change ends */}
        </Button>
      </Modal.ButtonRow>
    </>
  );
};
