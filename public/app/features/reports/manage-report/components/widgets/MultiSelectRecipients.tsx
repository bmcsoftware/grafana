import React, { FC, useState, useEffect } from 'react';
import { debounce } from 'lodash';
import { Field, InputControl, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { reportsSrv } from 'app/core/services/reports_srv';
import { ReportRecipientItem } from '../../types';
import { emailValidator, nonDuplicatedRecipients } from '../../utils';

type InputActionMeta = {
  action: 'set-value' | 'input-change' | 'input-blur' | 'menu-close';
};

interface Props {
  initialValues?: ReportRecipientItem[];
  selected?: ReportRecipientItem[];
  control: any;
  errors: any;
  onSelect: (v: ReportRecipientItem[]) => void;
  canCreate?: boolean;
}

interface State {
  recipients: ReportRecipientItem[];
  domains: {
    whitelist: string[];
    internalOnly: boolean;
  };
}

export const MultiSelectRecipients: FC<Props> = ({
  initialValues = [],
  selected = [],
  onSelect,
  canCreate = true,
  control,
  errors,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined | null>((errors.recipients as any)?.message);
  const [state, setState] = useState<State>({
    recipients: initialValues,
    domains: {
      whitelist: [],
      internalOnly: false,
    },
  });

  const addRecipientsToOptions = (values: ReportRecipientItem[]) => {
    const currentOptions = [...state.recipients, ...values];
    const recipientsOptions = nonDuplicatedRecipients(currentOptions);
    setState({ ...state, recipients: recipientsOptions });
  };

  const prepareEmailDomainLimit = () => {
    reportsSrv.getReportSettings().then((value) => {
      setState({
        ...state,
        domains: {
          whitelist: value.whitelistedDomains,
          internalOnly: value.internalDomainsOnly,
        },
      });
    });
  };

  const onSearch = debounce((query: any) => {
    if (query.includes(';')) {
      setIsLoading(false);
      return;
    }
    reportsSrv.getTenantUsers(query).then((value) => {
      const usersWithValidEmails = value.filter((item: any) => emailValidator(item.email));
      const recipientsList: ReportRecipientItem[] = usersWithValidEmails.map((userItem: any) => {
        return {
          label: userItem.name ? userItem.name : userItem.login,
          value: userItem.email,
          description: userItem.email,
        };
      });
      addRecipientsToOptions(recipientsList);
      setIsLoading(false);
    });
  }, 1500);

  const onCreateNewOption = (query: string) => {
    query = query.replace(/;[\s]*|,[\s]*|\s/g, ';');
    let newOptions = query
      .split(';')
      .filter((item) => item !== '')
      .map((item: string) => item.trim());

    let invalidEmails = newOptions.filter((item: string) => !emailValidator(item));
    let validEmails = newOptions.filter((item: string) => emailValidator(item));
    let hasError = false;
    if (invalidEmails.length > 0) {
      setError(`Invalid email: ${invalidEmails.toString()}`);
      hasError = true;
    }

    const { whitelist, internalOnly } = state.domains;
    if (whitelist.length > 0 && !internalOnly) {
      validEmails = newOptions
        .filter((recipient: any) => {
          const isValid = whitelist.some((domain) => recipient.includes(domain));
          if (!isValid && !hasError) {
            setError(`${recipient}'s domain is not allowed.`);
          }
          return isValid;
        })
        .filter(Boolean);
    }

    const values = validEmails.map((item) => {
      const customRecipient: ReportRecipientItem = { value: item, label: item };
      return customRecipient;
    });

    const recipients = [...selected, ...values];
    onSelect(nonDuplicatedRecipients(recipients));

    return values;
  };

  const onFilterChange = (option: any, searchQuery: string) => {
    searchQuery = searchQuery.toLocaleLowerCase();
    const isValidMail = new RegExp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/).test(searchQuery);
    if (!searchQuery.length) {
      return option;
    } else if (option.data.__isNew__ && isValidMail) {
      return option;
    } else if (
      (option.data.value as string)?.toLocaleLowerCase()?.includes(searchQuery) ||
      (option.data.label as string)?.toLocaleLowerCase()?.includes(searchQuery) ||
      (option.data.description as string)?.toLocaleLowerCase()?.includes(searchQuery)
    ) {
      return option;
    }
  };

  useEffect(() => {
    prepareEmailDomainLimit();
  }, []);

  return (
    <Field
      label="Recipients"
      invalid={!!errors.recipients || !!error}
      error={(errors.recipients as any)?.message || error}
    >
      <InputControl
        name="recipients"
        control={control}
        render={({}) => {
          return (
            <MultiSelect
              value={selected}
              options={[...state.recipients, ...selected]}
              onChange={(values: SelectableValue<string>[]) => {
                onSelect(values as ReportRecipientItem[]);
                return values;
              }}
              filterOption={onFilterChange}
              onInputChange={(query: string, actionMeta: InputActionMeta) => {
                if (actionMeta.action === 'input-change') {
                  setIsLoading(true);
                  onSearch(query);
                }
              }}
              onOpenMenu={() => {
                delete errors.recipients;
                setError(undefined);
              }}
              invalid={!!errors || !!error}
              onCreateOption={onCreateNewOption}
              allowCustomValue={canCreate && !state.domains.internalOnly}
              backspaceRemovesValue={true}
              closeMenuOnSelect={true}
              tabSelectsValue={true}
              isClearable={true}
              isSearchable={true}
              isLoading={isLoading}
            />
          );
        }}
        rules={{
          required: true,
          validate: (validate) => {
            if (validate.length === 0) {
              return 'At least one recipient is required.';
            }
            if (!validate.every((v: any) => emailValidator(v.value))) {
              return 'Invalid email.';
            }
            return true;
          },
        }}
      />
    </Field>
  );
};
