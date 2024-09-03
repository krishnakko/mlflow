/* eslint-disable no-console */
import {
  Button,
  Empty,
  NotificationIcon,
  Modal,
  Pagination,
  PlusIcon,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableRowSelectCell,
  LegacyTooltip,
  Typography,
  useDesignSystemTheme,
} from '@databricks/design-system';
import {
  ColumnDef,
  PaginationState,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { KeyValueEntity, ModelEntity, ModelVersionInfoEntity, ModelAliasMap } from '../../experiment-tracking/types';
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { RegisteringModelDocUrl } from '../../common/constants';
import {
  ACTIVE_STAGES,
  EMPTY_CELL_PLACEHOLDER,
  ModelVersionStatusIcons,
  StageTagComponents,
  modelVersionStatusIconTooltips,
} from '../constants';
import { Link } from '../../common/utils/RoutingUtils';
import { ModelRegistryRoutes } from '../routes';
import Utils from '../../common/utils/Utils';
import { KeyValueTagsEditorCell } from '../../common/components/KeyValueTagsEditorCell';
import { useDispatch } from 'react-redux';
import { ThunkDispatch } from '../../redux-types';
import { useEditKeyValueTagsModal } from '../../common/hooks/useEditKeyValueTagsModal';
import { useEditRegisteredModelAliasesModal } from '../hooks/useEditRegisteredModelAliasesModal';
import { updateModelVersionTagsApi } from '../actions';
import { ModelVersionTableAliasesCell } from './aliases/ModelVersionTableAliasesCell';
import { Interpolation, Theme } from '@emotion/react';
import { truncateToFirstLineWithMaxLength } from '../../common/utils/StringUtils';
import ExpandableList from '../../common/components/ExpandableList';
import { ReactComponent as CancelIcon } from "../../shared/ico-cancel-circle.svg";
import { ReactComponent as CheckIcon } from "../../shared/ico-check-circle.svg";
import { getLocalStorageItem, jenkinsJobEndStatuses } from '../../utils';
import { publishModelJenkinsStatus, publishModelVersionApi, removeModelVersionApi } from '../../common/actions';
import { Loader, TransparentLoader } from '../../common/Loader';

type ModelVersionTableProps = {
  modelName: string;
  publishedVersions: any;
  modelVersions?: ModelVersionInfoEntity[];
  activeStageOnly?: boolean;
  onChange: (selectedRowKeys: string[], selectedRows: ModelVersionInfoEntity[]) => void;
  modelEntity?: ModelEntity;
  onMetadataUpdated: () => void;
  usingNextModelsUI: boolean;
  aliases?: ModelAliasMap;
  getPublishedVersions: (modelName: any) => void;
  publishedRetrieved: boolean;
};

type ModelVersionColumnDef = ColumnDef<ModelVersionInfoEntity> & {
  meta?: { styles?: Interpolation<Theme>; multiline?: boolean; className?: string };
};

enum COLUMN_IDS {
  STATUS = 'STATUS',
  VERSION = 'VERSION',
  CREATION_TIMESTAMP = 'CREATION_TIMESTAMP',
  USER_ID = 'USER_ID',
  TAGS = 'TAGS',
  STAGE = 'STAGE',
  DESCRIPTION = 'DESCRIPTION',
  ALIASES = 'ALIASES',
  PUBLISHED = 'PUBLISHED',
  ACTIONS = 'ACTIONS',
}

export const ModelVersionTable = ({
  modelName,
  modelVersions,
  activeStageOnly,
  onChange,
  modelEntity,
  onMetadataUpdated,
  usingNextModelsUI,
  aliases,
  publishedVersions,
  getPublishedVersions,
  publishedRetrieved,
}: ModelVersionTableProps) => {
  const aliasesByVersion = useMemo(() => {
    const result: Record<string, string[]> = {};
    aliases?.forEach(({ alias, version }) => {
      if (!result[version]) {
        result[version] = [];
      }
      result[version].push(alias);
    });
    return result;
  }, [aliases]);
  const versions = useMemo(
    () =>
      activeStageOnly
        ? (modelVersions || []).filter(({ current_stage }) => ACTIVE_STAGES.includes(current_stage))
        : modelVersions,
    [activeStageOnly, modelVersions],
  );

  const { theme } = useDesignSystemTheme();
  const intl = useIntl();
  const loopTime = 5000;
  // If you wish to proceed with publishing of this model please click Continue or click Cancel to abort.
  const confirmationPublishMessage = "If you wish to proceed with publishing of this model please click Continue or click Cancel to abort."
  const confirmationUnpublishMessage = "If you wish to proceed with unpublishing of this model please click Continue or click Cancel to abort. This will unpublish this model version."
  const unPublishContinueMessage = "The process of unpublishing for this model version is currently in progress. Once finished, the URL for public access will be deactivated. We appreciate your patience."
  const [confirmPublish, setConfirmPublish] = useState<boolean>(false);
  const [prodMessage, setProdMessage] = useState<string>(confirmationPublishMessage);
  const [versionSelected, setVersionSelected] = useState<any>(null);
  const [action, setAction] = useState<string>("Publish");
  const [loader, setLoader] = useState<boolean>(false);
  const [publishResponse, setPublishResponse] = useState<any>(null);
  const [jenkinsJobStatus, setJenkinsJobStatus] = useState<any>(null);
  const [publishedVersion, setPublishedVersion] = useState<any>([]);
  const [publishedRunId, setPublishedRunId] = useState<any>([]);
  const [versionsList, setVersionsList] = useState<any>([]);
  const [continueClicked, setContinueClicked] = useState<boolean>(false);

  const allTagsKeys = useMemo(() => {
    const allTagsList: KeyValueEntity[] = versions?.map((modelVersion) => modelVersion?.tags || []).flat() || [];

    // Extract keys, remove duplicates and sort the
    return Array.from(new Set(allTagsList.map(({ key }) => key))).sort();
  }, [versions]);

  const dispatch = useDispatch<ThunkDispatch>();

  const { EditTagsModal, showEditTagsModal } = useEditKeyValueTagsModal<ModelVersionInfoEntity>({
    allAvailableTags: allTagsKeys,
    saveTagsHandler: async (modelVersion, existingTags, newTags) =>
      dispatch(updateModelVersionTagsApi(modelVersion, existingTags, newTags)),
    onSuccess: onMetadataUpdated,
  });

  const { EditAliasesModal, showEditAliasesModal } = useEditRegisteredModelAliasesModal({
    model: modelEntity || null,
    onSuccess: onMetadataUpdated,
  });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [pagination, setPagination] = useState<PaginationState>({
    pageSize: 10,
    pageIndex: 0,
  });

  useEffect(() => {
    if (publishedVersions) {
      const runIds = publishedVersions?.map((rec: any) => rec.run_id);
      setPublishedRunId(runIds)
    }
  }, [publishedVersions])

  useEffect(() => {
    if (versions) {
      const versions_ = versions.map((rec: any) => {
        return {
          ...rec,
          published: publishedRunId.includes(rec.run_id)
        }
      });
      setVersionsList(versions_)
    }
  }, [publishedRunId, versions])

  useEffect(() => {
    if (jenkinsJobStatus && publishResponse?.build_id?.location) {
      // eslint-disable-next-line no-console
      console.log("Jenkins Job Status", publishResponse?.build_id?.location, jenkinsJobStatus)
      startJenkinsJobStatusCall(publishResponse?.build_id?.location);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenkinsJobStatus])

  const startJenkinsJobStatusCall = async (location: string) => {
    const actionName = action === "Unpublish" ? "mlflow-remove-version" : "mlflow-publish";
    const response: any = await publishModelJenkinsStatus(actionName, location);
    console.log("response in UseEffect", response, !jenkinsJobEndStatuses.includes(response?.build_status));
    if ((response?.build_number_ || response?.build_status) && !jenkinsJobEndStatuses.includes(response?.build_status)) {
      setTimeout(() => {
        setJenkinsJobStatus(response);
      }, loopTime)
    } else if (response?.build_status === "SUCCESS") {
      getPublishedVersions(modelName);
    }
  }

  useEffect(() => {
    const selectedVersions = (versions || []).filter(({ version }) => rowSelection[version]);
    const selectedVersionNumbers = selectedVersions.map(({ version }) => version);
    onChange(selectedVersionNumbers, selectedVersions);
  }, [rowSelection, onChange, versions]);


  const onPublishClick = (version: any) => {
    setAction("Publish")
    setVersionSelected(version);
    setConfirmPublish(true);
  }

  const onUnpublishClick = (version: any) => {
    console.log("versionSelected==", version)
    setAction("Unpublish")
    setVersionSelected(version);
    setConfirmPublish(true);
    setProdMessage(confirmationUnpublishMessage)
  }

  const onClickCancel = () => {
    setConfirmPublish(false);
    setContinueClicked(false);
    setProdMessage(confirmationPublishMessage);
  }

  const startPublish = async () => {
    if (continueClicked) {
      onClickCancel()
    } else {
      setContinueClicked(true);
      setLoader(true)
      try {
        if (action === "Publish") {
          const payload = {
            "projectId": getLocalStorageItem("displayProjectId"),
            "runID": versionSelected?.run_id,
            "Model_name": versionSelected?.name,
            "version": versionSelected?.version
          }
          const response = await publishModelVersionApi(payload);
          // eslint-disable-next-line no-console
          console.log("responseresponse== in startPublish", response);
          if (response?.build_id?.location) {
            setPublishResponse(response);
            setTimeout(() => {
              setJenkinsJobStatus({ build_status: "IN PROGRESS" });
            }, loopTime)
            setProdMessage("The hosting process for this model version is presently underway. Upon completion, a URL for public access will be furnished on the same page. We sincerely appreciate your patience and look forward to delivering a seamless and efficient service experience to you. If a previous version of the model was hosted, the new model will be available at the same URL.")
          }
        } else if (action === "Unpublish") {
          const params = {
            "name": versionSelected?.name,
          }
          const response = await removeModelVersionApi(versionSelected?.run_id, params);
          if (response?.build_id?.location) {
            setPublishResponse(response);
            setTimeout(() => {
              setJenkinsJobStatus({ build_status: "IN PROGRESS" });
            }, loopTime)
            setProdMessage(unPublishContinueMessage);
          }
        }
        setLoader(false);
      } catch (e) {
        setLoader(false)
      }
    }
  };



  const tableColumns = useMemo(() => {
    const columns: ModelVersionColumnDef[] = [
      {
        id: COLUMN_IDS.STATUS,
        enableSorting: false,
        header: '', // Status column does not have title
        meta: { styles: { flexBasis: theme.general.heightSm, flexGrow: 0 } },
        cell: ({ row: { original } }) => {
          const { status, status_message } = original || {};
          return (
            <LegacyTooltip title={status_message || modelVersionStatusIconTooltips[status]}>
              <Typography.Text>{ModelVersionStatusIcons[status]}</Typography.Text>
            </LegacyTooltip>
          );
        },
      },
    ];
    columns.push(
      {
        id: COLUMN_IDS.VERSION,
        enableSorting: false,
        header: intl.formatMessage({
          defaultMessage: 'Version',
          description: 'Column title text for model version in model version table',
        }),
        meta: { className: 'model-version' },
        accessorKey: 'version',
        cell: ({ getValue }) => (
          <FormattedMessage
            defaultMessage="<link>Version {versionNumber}</link>"
            description="Link to model version in the model version table"
            values={{
              link: (chunks) => (
                <Link to={ModelRegistryRoutes.getModelVersionPageRoute(modelName, String(getValue()))}>{chunks}</Link>
              ),
              versionNumber: getValue(),
            }}
          />
        ),
      },
      {
        id: COLUMN_IDS.CREATION_TIMESTAMP,
        enableSorting: true,
        meta: { styles: { minWidth: 200 } },
        header: intl.formatMessage({
          defaultMessage: 'Registered at',
          description: 'Column title text for created at timestamp in model version table',
        }),
        accessorKey: 'creation_timestamp',
        cell: ({ getValue }) => Utils.formatTimestamp(getValue()),
      },

      {
        id: COLUMN_IDS.USER_ID,
        enableSorting: false,
        meta: { styles: { minWidth: 100 } },
        header: intl.formatMessage({
          defaultMessage: 'Created by',
          description: 'Column title text for creator username in model version table',
        }),
        accessorKey: 'user_id',
        cell: ({ getValue }) => <span>{getValue()}</span>,
      },
    );

    if (usingNextModelsUI) {
      // Display tags and aliases columns only when "new models UI" is flipped
      columns.push(
        {
          id: COLUMN_IDS.TAGS,
          enableSorting: false,
          header: intl.formatMessage({
            defaultMessage: 'Tags',
            description: 'Column title text for model version tags in model version table',
          }),
          meta: { styles: { flex: 2 } },
          accessorKey: 'tags',
          cell: ({ getValue, row: { original } }) => {
            return (
              <KeyValueTagsEditorCell
                tags={getValue() as KeyValueEntity[]}
                onAddEdit={() => {
                  showEditTagsModal?.(original);
                }}
              />
            );
          },
        },
        {
          id: COLUMN_IDS.ALIASES,
          accessorKey: 'aliases',
          enableSorting: false,
          header: intl.formatMessage({
            defaultMessage: 'Aliases',
            description: 'Column title text for model version aliases in model version table',
          }),
          meta: { styles: { flex: 2 }, multiline: true },
          cell: ({ getValue, row: { original } }) => {
            const mvAliases = aliasesByVersion[original.version] || [];
            return (
              <ModelVersionTableAliasesCell
                modelName={modelName}
                version={original.version}
                aliases={mvAliases}
                onAddEdit={() => {
                  showEditAliasesModal?.(original.version);
                }}
              />
            );
          },
        },
      );
    } else {
      // If not, display legacy "Stage" columns
      columns.push({
        id: COLUMN_IDS.STAGE,
        enableSorting: false,
        header: intl.formatMessage({
          defaultMessage: 'Stage',
          description: 'Column title text for model version stage in model version table',
        }),
        accessorKey: 'current_stage',
        cell: ({ getValue }) => {
          return StageTagComponents[getValue() as string];
        },
      });
    }
    columns.push({
      id: COLUMN_IDS.DESCRIPTION,
      enableSorting: false,
      header: intl.formatMessage({
        defaultMessage: 'Description',
        description: 'Column title text for description in model version table',
      }),
      meta: { styles: { flex: 2 } },
      accessorKey: 'description',
      cell: ({ getValue }) => truncateToFirstLineWithMaxLength(getValue(), 32),
    });
    columns.push({
      id: COLUMN_IDS.PUBLISHED,
      enableSorting: false,
      header: intl.formatMessage({
        defaultMessage: 'Published',
        description: 'Published is for checking whether the the model version is published or not.',
      }),
      meta: { styles: { flex: 2 } },
      accessorKey: 'published',
      cell: ({ row: { original } }) => {
        const published = original?.published;
        return (
          <span>
            {publishedRetrieved ? (published ? <CheckIcon style={{ width: "14px", height: "14px", position: "relative", top: "2px", marginRight: "5px" }} /> : <CancelIcon style={{ width: "14px", height: "14px", position: "relative", top: "2px", marginRight: "5px" }} />) : "--"}
          </span>
        );
      },
    });
    columns.push({
      id: COLUMN_IDS.ACTIONS,
      enableSorting: false,
      header: intl.formatMessage({
        defaultMessage: 'Actions',
        description: 'Actions is for doing some necessary actions.',
      }),
      meta: { styles: { flex: 2 } },
      accessorKey: 'actions',
      cell: ({ row: { original } }) => {
        const published = original?.published;
        return (
          <span>
            <Button
              componentId='publishedOrNot'
              type='link'
              className={`${published ? "publishedIcon" : "publishIcon"}`}
              onClick={() => {
                if (publishedRetrieved) {
                  if (published) {
                    onUnpublishClick(original)
                  } else {
                    onPublishClick(original)
                  }
                }
              }}
              data-test-id='publish-version-button'
            >
              {publishedRetrieved ? (published ? "Unpublish" : "Publish") : "--"}
            </Button>
          </span>
        );
      },
    });
    // actions ->UnPublish and Publish
    return columns;
  }, [theme, intl, modelName, showEditTagsModal, showEditAliasesModal, usingNextModelsUI, aliasesByVersion, publishedRetrieved]);

  const [sorting, setSorting] = useState<SortingState>([
    { id: COLUMN_IDS.CREATION_TIMESTAMP, desc: true },
  ]);

  const table = useReactTable<ModelVersionInfoEntity>({
    data: versions || [],
    columns: tableColumns,
    state: {
      pagination,
      rowSelection,
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: ({ version }) => version,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
  });

  const isEmpty = () => table.getRowModel().rows.length === 0;

  const getLearnMoreLinkUrl = () => {
    return RegisteringModelDocUrl;
  };

  const paginationComponent = (
    <Pagination
      currentPageIndex={pagination.pageIndex + 1}
      numTotal={(versions || []).length}
      onChange={(page, pageSize) => {
        setPagination({
          pageSize: pageSize || pagination.pageSize,
          pageIndex: page - 1,
        });
      }}
      pageSize={pagination.pageSize}
    />
  );

  const emptyComponent = (
    <Empty
      description={
        <FormattedMessage
          defaultMessage="No models versions are registered yet. <link>Learn more</link> about how to
          register a model version."
          description="Message text when no model versions are registered"
          values={{
            link: (chunks) => (
              <Typography.Link target="_blank" href={getLearnMoreLinkUrl()}>
                {chunks}
              </Typography.Link>
            ),
          }}
        />
      }
      image={<PlusIcon />}
    />
  );

  return (
    <>
      <div>
        {
          loader && <div className="transparentLoader">
            {/* <TransparentLoader /> */}
            <Loader />
          </div>
        }

        <Modal
          visible={confirmPublish}
          title={
            action === "Publish" ? 'Publish' : 'Unpublish'
          }
          // okText='Continue'
          // cancelText='Cancel'
          okText={continueClicked ? 'OK' : 'Continue'}
          cancelText={continueClicked ? undefined : "Cancel"}
          onCancel={onClickCancel}
          onOk={() => {
            startPublish();
          }}
        >
          <div>
            {prodMessage}
          </div>
        </Modal>
      </div>
      <Table
        data-testid="model-list-table"
        pagination={paginationComponent}
        scrollable
        empty={isEmpty() ? emptyComponent : undefined}
        someRowsSelected={table.getIsSomeRowsSelected() || table.getIsAllRowsSelected()}
      >
        <TableRow isHeader>
          <TableRowSelectCell
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
          {table.getLeafHeaders().map((header) => (
            <TableHeader
              multiline={false}
              key={header.id}
              sortable={header.column.getCanSort()}
              sortDirection={header.column.getIsSorted() || 'none'}
              onToggleSort={header.column.getToggleSortingHandler()}
              css={(header.column.columnDef as ModelVersionColumnDef).meta?.styles}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </TableHeader>
          ))}
        </TableRow>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            css={{
              '.table-row-select-cell': {
                alignItems: 'flex-start',
              },
            }}
          >
            <TableRowSelectCell checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
            {row.getAllCells().map((cell) => (
              <TableCell
                className={(cell.column.columnDef as ModelVersionColumnDef).meta?.className}
                multiline={(cell.column.columnDef as ModelVersionColumnDef).meta?.multiline}
                key={cell.id}
                css={(cell.column.columnDef as ModelVersionColumnDef).meta?.styles}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </Table>
      {EditTagsModal}
      {EditAliasesModal}
    </>
  );
};
