import React, { useState } from 'react';

import { Button, HorizontalGroup, IconButton, useStyles2 } from '@grafana/ui';
import { contextSrv } from 'app/core/services/context_srv';
import { FolderDTO } from 'app/types';

import { GENERAL_FOLDER_UID } from '../../constants';
import { OnMoveOrDeleleSelectedItems } from '../../types';

import { getStyles } from './ActionRow';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
// BMC Change: Next line
import { ConfirmExportModal } from './ConfirmExportModal';
import { MoveToFolderModal } from './MoveToFolderModal';

type Props = {
  items: Map<string, Set<string>>;
  folder?: FolderDTO; // when we are loading in folder page
  onChange: OnMoveOrDeleleSelectedItems;
  clearSelection: () => void;
};

export function ManageActions({ items, folder, onChange, clearSelection }: Props) {
  const styles = useStyles2(getStyles);

  const canSave = folder?.canSave;
  const hasEditPermissionInFolders = folder ? canSave : contextSrv.hasEditPermissionInFolders;

  const canMove = hasEditPermissionInFolders;

  const selectedFolders = Array.from(items.get('folder') ?? []);
  const includesGeneralFolder = selectedFolders.find((result) => result === GENERAL_FOLDER_UID);

  const canDelete = hasEditPermissionInFolders && !includesGeneralFolder;
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // BMC Code: Next block
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const onMove = () => {
    setIsMoveModalOpen(true);
  };

  const onDelete = () => {
    setIsDeleteModalOpen(true);
  };

  return (
    <div className={styles.actionRow} data-testid="manage-actions">
      <div className={styles.rowContainer}>
        <HorizontalGroup spacing="md" width="auto">
          <IconButton name="check-square" onClick={clearSelection} title="Uncheck everything" />
          <Button disabled={!canMove} onClick={onMove} icon="exchange-alt" variant="secondary">
            Move
          </Button>
          {/* BMC code */}
          {0 < Array.from(items.get('dashboard') ?? []).length ? (
            <Button
              icon={'import'}
              variant="secondary"
              disabled={!canMove}
              onClick={() => {
                setIsExportModalOpen(true);
              }}
            >
              Export
            </Button>
          ) : null}
          {/* End */}
          <Button disabled={!canDelete} onClick={onDelete} icon="trash-alt" variant="destructive">
            Delete
          </Button>
        </HorizontalGroup>
      </div>

      <ConfirmDeleteModal
        onDeleteItems={onChange}
        results={items}
        isOpen={isDeleteModalOpen}
        onDismiss={() => setIsDeleteModalOpen(false)}
      />
      <MoveToFolderModal
        onMoveItems={onChange}
        results={items}
        isOpen={isMoveModalOpen}
        onDismiss={() => setIsMoveModalOpen(false)}
      />
      {/* BMC code */}
      <ConfirmExportModal
        onExportDone={onChange}
        results={items}
        isOpen={isExportModalOpen}
        onDismiss={() => setIsExportModalOpen(false)}
      />
      {/* End */}
    </div>
  );
}
