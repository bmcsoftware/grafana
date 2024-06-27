import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { PanelData, RawTimeRange } from '@grafana/data';
import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';
import { getTimeSrv } from 'app/features/dashboard/services/TimeSrv';

import { DashboardModel } from '../dashboard/state';

declare global {
  interface Window {
    grafanaRuntime?: {
      getDashboardSaveModel: () => DashboardModel | undefined;
      getDashboardTimeRange: () => { from: number; to: number; raw: RawTimeRange };
      getPanelData: () => Record<number, PanelData | undefined> | undefined;
      generatePdf: (fileName: string, template: any) => void;
    };
  }
}

/**
 * This will setup features that are accessible through the root window location
 *
 * This is useful for manipulating the application from external drivers like puppetter/cypress
 *
 * @internal and subject to change
 */
export function initWindowRuntime() {
  window.grafanaRuntime = {
    /** Get info for the current dashboard.  This will include the migrated dashboard JSON */
    getDashboardSaveModel: () => {
      const d = getDashboardSrv().getCurrent();
      if (!d) {
        return undefined;
      }
      return d.getSaveModelClone();
    },

    /** The selected time range */
    getDashboardTimeRange: () => {
      const tr = getTimeSrv().timeRange();
      return {
        from: tr.from.valueOf(),
        to: tr.to.valueOf(),
        raw: tr.raw,
      };
    },

    /** Get the query results for the last loaded data */
    getPanelData: () => {
      const d = getDashboardSrv().getCurrent();
      if (!d) {
        return undefined;
      }
      return d.panels.reduce<Record<number, PanelData | undefined>>((acc, panel) => {
        acc[panel.id] = panel.getQueryRunner().getLastResult();
        return acc;
      }, {});
    },

   /**
    * This function utilizes JSPDF-Autotable library to generate the PDF mainly for cross tab plugin which will
    * be streamed at the renderrer side after download and then merged with the final output PDF.
    * This code is needed to be here because we can't get HTMLTableElement instance at the renderrer side
    * using pupeteer. For merged colspan and rowspan entries, best way to generate the PDF is using HTMLTableElement
    * instance which is supported by the JSPDF-Autotable library. This function is executed in browser console
    * by renderrer to download the PDF in browser and then reading it like we are reading CSV file.
    *
    * @param fileName - Random fileName of the file to avoid conflicts.
    * @param template - template instance which contains all basic details about header/footer, logo, orientation, theme etc.
    */
    generatePdf: (fileName: string, template: any) => {
      const urlParams = new URLSearchParams(window.location.search);
      const panelId = Number(urlParams.get('viewPanel'));
      const panel = getDashboardSrv().getCurrent()?.getPanelById(panelId || 0);
      const orientation = template.orientation === "landscape" ? 'l' : 'p';
      const lightTheme = template.theme === 'light';

      if (panel?.type === 'bmc-ade-cross-tab') {
        // - `A3` Paper Size: 11.7in x 16.54in (842.4pt x 1190.88pt) for Simple Layout
        let doc = new jsPDF(orientation, 'pt', [842.4, 1190.88]);
        let margin = 16;
        // Theme instance which contains color codes regardin light and dark theme.
        let theme = {
          fillColor: lightTheme ? '#FFFFFF' : '#181B1F',
          textColor: lightTheme ? '#505050' : '#CCCCDC',
          lineColor: lightTheme ? '#C7C7C7' : '#25272C',
          headerFillColor: lightTheme ? '#F8F8F9' : '#0B0C0E',
          bodyFillColor: lightTheme ? '#F4F5F5' : '#111217',
          tableHeaderFillColor: lightTheme ? '#E0E0E0' : '#181B1F',
          tableHeaderTextColor: lightTheme ? '#000000' : '#CCCCDC',
          headerTextColor: lightTheme ? '#000000' : '#9FA7B3',
          lineDrawColor: lightTheme ? '#000000' : '#2F2F32',
          hyperLinkColor: '#1F62E0'
        };

        // JSPDF-Autotable understands the HTMLTableElement instance to generate the PDF so redirecting
        // renderrer to open the view cross tab panel and finding the instance using the css selector.
        const selector: any = document.querySelector<HTMLTableElement>('.react-grid-layout table');
        autoTable(doc, {
          html: selector,
          theme: 'grid', 
          styles: {
            fillColor: theme.fillColor,
            textColor: theme.textColor,
            lineColor: theme.lineColor,
          },
          headStyles: {
            fillColor: theme.tableHeaderFillColor,
            textColor: theme.tableHeaderTextColor,
            lineWidth: 1
          },
          margin: { top: 85, left: margin, right: margin, bottom: 50 },
          startY: 105,
          willDrawPage: (data: any) => {
            // Adding Header to each page - HEADER //
            let fontFamily = 'helvetica';
      
            // Header/Footer BackGround Colour
            doc.setFillColor(theme.headerFillColor);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
      
            // Body BackGround Colour
            doc.setFillColor(theme.bodyFillColor);
            doc.rect(0, 75, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight() - 120, 'F');
      
            doc.setTextColor(theme.headerTextColor);
            doc.setFontSize(8).setFont(fontFamily, 'bold');
            doc.text(template.dashboardPath, margin, 20);
            doc.text('Data timerange:', doc.internal.pageSize.getWidth() - 200, 20);
            doc.text('to', doc.internal.pageSize.getWidth() - 147, 30);
      
            doc.setFontSize(8).setFont(fontFamily, 'normal');
            doc.text('- generated on ' + template.generatedAt, doc.getTextWidth(template.dashboardPath) + 30, 20);
            doc.text(template.from, doc.internal.pageSize.getWidth() - 137, 20);
            doc.text(template.to, doc.internal.pageSize.getWidth() - 137, 30);
      
            doc.setFontSize(12).setFont(fontFamily, 'bold');
            let pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
            let text = doc.splitTextToSize(template.reportName!, pageWidth - 35, {});
            doc.text(text, margin, 50);
      
            // Displaying the panel title only on the first page of the pdf for the table panel.
            if (data.pageNumber === 1) {
              doc.setFontSize(10);
              doc.text(panel.title, margin, 95);
            }
      
            // TODO - Need to check if its fine with PNG type for all custom logos.
            doc.addImage(template.companyLogo!, 'PNG', doc.internal.pageSize.getWidth() - 109, 37, 92, 32);
      
            doc.setDrawColor(theme.lineDrawColor);
            doc.setLineWidth(1.3);
            doc.line(margin, 75, doc.internal.pageSize.getWidth() - margin, 75);
          },
          didDrawPage: (data: any) => {
            // Adding Footer to each page - FOOTER //
            let fontFamily = 'helvetica';
            doc.setFontSize(8).setFont(fontFamily, 'bolditalic');
      
            doc.setTextColor(theme.headerTextColor);
            let xStartingPoint = doc.internal.pageSize.getWidth() - doc.getTextWidth(template.reportFooterText!) - 20;
            doc.text(template.reportFooterText!, xStartingPoint, doc.internal.pageSize.getHeight() - 20);
            doc.link(xStartingPoint, doc.internal.pageSize.getHeight() - 35, doc.getTextWidth(template.reportFooterText!), 15, {
              url: template.reportFooterURL!,
            });
          },
          willDrawCell: function (data: any) {
            let fontFamily = 'helvetica';
            let computedStyle = getComputedStyle(data.cell.raw);
            // Sometimes getting below mentioned rgb code from the computed style function which is invalid as well.
            if (computedStyle.color !== 'rgba(0, 0, 0, 0)') {
              doc.setTextColor(computedStyle.color);
            }
            if (computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)') {
              doc.setFillColor(computedStyle.backgroundColor);
            }

            if (data.cell.section === 'head' && data.cell.raw.nodeName === 'TH') {
              // For head, getting the correct text alignment value in the textAlignLast proeprty.
              if (computedStyle.textAlignLast) {
                data.cell.styles.halign = computedStyle.textAlignLast;
              }
              doc.setFont(fontFamily, 'bold');
            } else {
              // For body, getting the correct text alignment value in the textAlign proeprty.
              if (computedStyle.textAlign) {
                data.cell.styles.halign = computedStyle.textAlign;
              } 
              doc.setFont(fontFamily, 'normal');
            }

            let href;
            // If hyperlink is set for TH table nodes then below code is used to set the link for head and body section.
            if (data.cell.raw && data.cell.raw.nodeName === 'TH'
              && data.cell.raw.firstChild && data.cell.raw.firstChild.href) {
                href = data.cell.raw.firstChild.href;
            }

            // Below code is specifically for setting the link for body values only with TD node type.
            // Because we are reading HtmlTableElement so parsing the anchor directly from that and finding
            // the hyperlink cells. This implementation is different then table plugin hyperlink support.
            if (!href && data.cell.section === 'body' && data.cell.raw && data.cell.raw.firstChild 
              && data.cell.raw.firstChild.lastChild instanceof HTMLAnchorElement
              && data.cell.raw.firstChild.lastChild.href) {
                href = data.cell.raw.firstChild.lastChild.href;                            
            }

            if (href) {
              // Because of variable text size and alignment, it is best and simple to provide the hyperlink to full cell
              // to avoid unnecessary calculation about starting point and ending point of the link cursor box.
              doc.link(data.cell.x, data.cell.y, data.column.width, data.cell.contentHeight, {
                url: href,
              });
            }
          },
        });
        doc.save(fileName, { returnPromise: true });
      }
    }
  };

}
