import React, { FC } from 'react';
import { Input, Field, FieldSet, Form } from '@grafana/ui';

export interface Props {
  orgName: string;
  onSubmit: (orgName: string) => void;
}

interface FormDTO {
  orgName: string;
}

//BMC Code - added disabled and remove Update organization name button
const OrgProfile: FC<Props> = ({ onSubmit, orgName }) => {
  return (
    <Form defaultValues={{ orgName }} onSubmit={({ orgName }: FormDTO) => onSubmit(orgName)}>
      {({ register }) => (
        <FieldSet label="Organization profile">
          <Field label="Organization name" disabled>
            <Input id="org-name-input" type="text" {...register('orgName', { required: true })} />
          </Field>
          {
            //<Button type="submit">Update organization name</Button>
          }
        </FieldSet>
      )}
    </Form>
  );
};

export default OrgProfile;
