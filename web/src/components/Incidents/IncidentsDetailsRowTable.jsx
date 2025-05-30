import React from 'react';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  GreenCheckCircleIcon,
  isAlertingRulesSource,
  PrometheusEndpoint,
  ResourceIcon,
  Timestamp,
  useActiveNamespace,
  useResolvedExtensions,
} from '@openshift-console/dynamic-plugin-sdk';
import { BellIcon } from '@patternfly/react-icons';
import { Bullseye, DropdownItem, Spinner, Tooltip } from '@patternfly/react-core';
import { Link, useHistory } from 'react-router-dom';
import { AlertResource, getAlertsAndRules } from '../utils';
import { getPrometheusURL } from '../console/graphs/helpers';
import { fetchAlerts } from '../fetch-alerts';
import KebabDropdown from '../kebab-dropdown';
import { useTranslation } from 'react-i18next';
import {
  getAlertUrl,
  getNewSilenceAlertUrl,
  getRuleUrl,
  usePerspective,
} from '../hooks/usePerspective';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import './incidents-styles.css';
import { SeverityBadge } from '../alerting/AlertUtils';

const IncidentsDetailsRowTable = ({ alerts }) => {
  const history = useHistory();
  const [namespace] = useActiveNamespace();
  const { perspective } = usePerspective();
  const [alertsWithMatchedData, setAlertsWithMatchedData] = React.useState([]);
  const [customExtensions] = useResolvedExtensions(isAlertingRulesSource);
  const { t } = useTranslation(process.env.I18N_NAMESPACE);

  const alertsSource = React.useMemo(
    () =>
      customExtensions
        .filter((extension) => extension.properties.contextId === 'observe-alerting')
        .map((extension) => extension.properties),
    [customExtensions],
  );

  function findMatchingAlertsWithId(alertsArray, rulesArray) {
    // Map over alerts and find matching rules
    return alertsArray.map((alert) => {
      const match = rulesArray.find((rule) => alert.alertname === rule.name);

      if (match) {
        return { ...alert, rule: match };
      }
      return alert;
    });
  }

  React.useEffect(() => {
    const url = getPrometheusURL({ endpoint: PrometheusEndpoint.RULES });
    const poller = () => {
      fetchAlerts(url, alertsSource)
        .then(({ data }) => {
          const { rules } = getAlertsAndRules(data);
          //match rules fetched with alerts passed to this component by alertname
          setAlertsWithMatchedData(findMatchingAlertsWithId(alerts, rules));
        })
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.log(e);
        });
    };
    poller();
  }, [alerts, alertsSource]);

  return (
    <Table borders={'compactBorderless'}>
      <Thead>
        <Tr>
          <Th width={25}>{t('Alert Name')}</Th>
          <Th width={15}>{t('Namespace')}</Th>
          <Th width={10}>{t('Severity')}</Th>
          <Th width={10}>{t('State')}</Th>
          <Th width={20}>{t('Start')}</Th>
          <Th width={20}>{t('End')}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {!alertsWithMatchedData ? (
          <Bullseye>
            <Spinner aria-label="incidents-chart-spinner" />
          </Bullseye>
        ) : (
          alertsWithMatchedData?.map((alertDetails, rowIndex) => {
            return (
              <Tr key={rowIndex}>
                <Td dataLabel="expanded-details-alertname">
                  <ResourceIcon kind={AlertResource.kind} />
                  <Link
                    to={
                      alertDetails?.rule
                        ? getAlertUrl(perspective, alertDetails, alertDetails.rule.id, namespace)
                        : '#'
                    }
                    style={
                      !alertDetails?.rule || alertDetails.resolved
                        ? { pointerEvents: 'none', color: 'inherit', textDecoration: 'inherit' }
                        : {}
                    }
                  >
                    {alertDetails.alertname}
                  </Link>
                  {(!alertDetails?.rule || alertDetails.resolved) && (
                    <Tooltip content={<div>No details can be shown for inactive alerts.</div>}>
                      <OutlinedQuestionCircleIcon className="expanded-details-text-margin" />
                    </Tooltip>
                  )}
                </Td>
                <Td dataLabel="expanded-details-namespace">{alertDetails.namespace || '---'}</Td>
                <Td dataLabel="expanded-details-severity">
                  <SeverityBadge severity={alertDetails.severity} />
                </Td>
                <Td dataLabel="expanded-details-alertstate">
                  {!alertDetails.resolved ? (
                    <>
                      <BellIcon />
                      <span className="expanded-details-text-margin">Firing</span>
                    </>
                  ) : (
                    <>
                      <GreenCheckCircleIcon />
                      <span className="expanded-details-text-margin">Resolved</span>
                    </>
                  )}
                </Td>
                <Td dataLabel="expanded-details-firingstart">
                  <Timestamp simple={true} timestamp={alertDetails.alertsStartFiring} />
                </Td>
                <Td dataLabel="expanded-details-firingend">
                  {!alertDetails.resolved ? (
                    '---'
                  ) : (
                    <Timestamp simple={true} timestamp={alertDetails.alertsEndFiring} />
                  )}
                </Td>
                <Td>
                  <KebabDropdown
                    dropdownItems={[
                      <DropdownItem
                        component="button"
                        key="silence alert"
                        isDisabled={!alertDetails?.rule}
                        onClick={() =>
                          history.push(
                            getNewSilenceAlertUrl(perspective, alertDetails.rule, namespace),
                          )
                        }
                      >
                        {t('Silence alert')}
                      </DropdownItem>,
                      <DropdownItem key="view-rule" isDisabled={!alertDetails?.rule}>
                        <Link
                          to={getRuleUrl(perspective, alertDetails.rule)}
                          style={{ color: 'inherit', textDecoration: 'inherit' }}
                        >
                          {t('View alerting rule')}
                        </Link>
                      </DropdownItem>,
                    ]}
                  />
                </Td>
              </Tr>
            );
          })
        )}
      </Tbody>
    </Table>
  );
};

export default IncidentsDetailsRowTable;
