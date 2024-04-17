/*
 * Copyright (C) 2021 BMC Software Inc
 * Added by kmejdi at 29/7/2021
 */

import React, { FC, PureComponent } from 'react';

import { Input, Icon, Field, FormAPI } from '@grafana/ui';
import { t } from 'app/core/internationalization';

type onChangeValue = (value: any) => void;

interface CustomConfigProps extends Omit<FormAPI<any>, 'formState' | 'watch' | 'getValues'> {}

interface Props extends CustomConfigProps {
  onDocLinkChange: onChangeValue;
  onCommunityLinkChange: onChangeValue;
  onSupportLinkChange: onChangeValue;
  onVideoLinkChange: onChangeValue;
  docLink: string;
  supportLink: string;
  communityLink: string;
  videoLink: string;
}

interface State {}

export class OrgCustomConfiguration extends PureComponent<Props, State> {
  state: State = {};

  constructor(props: Props) {
    super(props);
  }

  async componentDidMount() {
    this.setState({
      docLink: this.props.docLink,
      supportLink: this.props.supportLink,
      communityLink: this.props.communityLink,
      videoLink: this.props.videoLink,
    });
  }

  validateURL = (value: any) => value.length === 0 || RegExp(/^(http|https):\/\/[^ "]+$/).test(value) || t('bmc.org-custom-config.invalid-url', 'Invalid URL!');

  render() {
    const { docLink, supportLink, communityLink, videoLink } = this.props;
    const { register, errors } = this.props;
    return (
      <>
        <Field label={t('bmc.org-custom-config.documentation', 'Documentation')} invalid={!!errors.docLink} error={errors.docLink && errors.docLink.message}>
          <Input
            type="text"
            value={docLink}
            {...register('docLink', {
              validate: this.validateURL,
            })}
            suffix={<DocSuffix />}
            onChange={this.props.onDocLinkChange}
          />
        </Field>
        <Field label={t('bmc.org-custom-config.support', 'Support')} invalid={!!errors.supportLink} error={errors.supportLink && errors.supportLink.message}>
          <Input
            type="text"
            value={supportLink}
            {...register('supportLink', {
              validate: this.validateURL,
            })}
            onChange={this.props.onSupportLinkChange}
            suffix={<SupportSuffix />}
          />
        </Field>
        <Field
          label={t('bmc.org-custom-config.community', 'Community')}
          invalid={!!errors.communityLink}
          error={errors.communityLink && errors.communityLink.message}
        >
          <Input
            type="text"
            value={communityLink}
            {...register('communityLink', {
              validate: this.validateURL,
            })}
            onChange={this.props.onCommunityLinkChange}
            suffix={<CommunitySuffix />}
          />
        </Field>
        <Field label={t('bmc.org-custom-config.video', 'Video')} invalid={!!errors.videoLink} error={errors.videoLink && errors.videoLink.message}>
          <Input
            type="text"
            value={videoLink}
            {...register('videoLink', {
              validate: this.validateURL,
            })}
            onChange={this.props.onVideoLinkChange}
            suffix={<VideoSuffix />}
          />
        </Field>
      </>
    );
  }
}

const DocSuffix: FC = () => {
  return <Icon name="document-info" />;
};

const SupportSuffix: FC = () => {
  return <Icon name="question-circle" />;
};

const CommunitySuffix: FC = () => {
  return <Icon name="comments-alt" />;
};

const VideoSuffix: FC = () => {
  return <Icon name="link" />;
};
