import React, { useState } from 'react';
import { Building, Users, Plus, ChevronRight, ChevronDown, Edit, Trash2, UserPlus } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  memberCount: number;
  children?: Organization[];
  isExpanded?: boolean;
}

const Organizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([
    {
      id: '1',
      name: 'Đoàn Trường ĐHBK',
      type: 'doan_truong',
      description: 'Đoàn Thanh niên Trường Đại học Bách khoa',
      memberCount: 856,
      isExpanded: true,
      children: [
        {
          id: '2',
          name: 'Đoàn Cơ sở Khoa CNTT',
          type: 'doan_co_so',
          description: 'Đoàn Cơ sở Khoa Công nghệ Thông tin',
          memberCount: 234,
          isExpanded: false,
          children: [
            {
              id: '3',
              name: 'Chi Đoàn Lớp CC21',
              type: 'chi_doan',
              memberCount: 28,
            },
            {
              id: '4',
              name: 'Chi Đoàn Lớp CC22',
              type: 'chi_doan',
              memberCount: 32,
            }
          ]
        }
      ]
    },
    {
      id: '5',
      name: 'Hội Sinh viên Trường',
      type: 'hoi_sinh_vien_truong',
      description: 'Hội Sinh viên Trường ĐHBK',
      memberCount: 678,
      isExpanded: true,
      children: [
        {
          id: '6',
          name: 'Liên Chi Hội Khoa CNTT',
          type: 'lien_chi_hoi',
          description: 'Liên Chi Hội Khoa Công nghệ Thông tin',
          memberCount: 198,
          isExpanded: false,
          children: [
            {
              id: '7',
              name: 'Chi Hội CC21',
              type: 'chi_hoi',
              memberCount: 25,
            }
          ]
        },
        {
          id: '8',
          name: 'CLB Tin học',
          type: 'clb_truong',
          description: 'Câu lạc bộ Tin học cấp Trường',
          memberCount: 45,
        }
      ]
    }
  ]);

  const getOrgTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'doan_truong': 'Đoàn Trường',
      'doan_co_so': 'Đoàn Cơ sở',
      'chi_doan': 'Chi Đoàn',
      'hoi_sinh_vien_truong': 'Hội SV Trường',
      'lien_chi_hoi': 'Liên Chi Hội',
      'chi_hoi': 'Chi Hội',
      'clb_truong': 'CLB Trường',
      'clb_khoa': 'CLB Khoa'
    };
    return typeMap[type] || type;
  };

  const getOrgTypeColor = (type: string) => {
    if (type.includes('doan')) {
      return 'bg-doan-100 text-doan-800 border-doan-200';
    } else if (type.includes('hoi') || type.includes('clb')) {
      return 'bg-hsv-100 text-hsv-800 border-hsv-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const toggleExpanded = (id: string, orgs: Organization[]): Organization[] => {
    return orgs.map(org => {
      if (org.id === id) {
        return { ...org, isExpanded: !org.isExpanded };
      }
      if (org.children) {
        return { ...org, children: toggleExpanded(id, org.children) };
      }
      return org;
    });
  };

  const renderOrganization = (org: Organization, level: number = 0) => {
    const hasChildren = org.children && org.children.length > 0;
    const paddingLeft = level * 24;

    return (
      <div key={org.id}>
        <div 
          className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          style={{ paddingLeft: paddingLeft + 16 }}
        >
          <div className="flex items-center flex-1">
            {hasChildren ? (
              <button
                onClick={() => setOrganizations(prev => toggleExpanded(org.id, prev))}
                className="mr-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {org.isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2" />
            )}
            
            <Building className="w-5 h-5 text-gray-400 mr-3" />
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {org.name}
                </h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOrgTypeColor(org.type)}`}>
                  {getOrgTypeText(org.type)}
                </span>
              </div>
              {org.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {org.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4 mr-1" />
              {org.memberCount}
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                <UserPlus className="w-4 h-4" />
              </button>
              <button className="p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300">
                <Edit className="w-4 h-4" />
              </button>
              <button className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {org.isExpanded && org.children && (
          <div>
            {org.children.map(child => renderOrganization(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Quản lý Tổ chức
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Quản lý cấu trúc tổ chức Đoàn, Hội và CLB
          </p>
        </div>
        <button className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-doan-500 text-white rounded-md hover:bg-doan-600 transition-colors">
          <Plus className="w-5 h-5 mr-2" />
          Tạo tổ chức
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-doan-500">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tổ chức Đoàn
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                12
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-hsv-500">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tổ chức Hội
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                18
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Câu lạc bộ
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                15
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tổng thành viên
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                1,534
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Tree */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Cây tổ chức
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {organizations.map(org => renderOrganization(org))}
        </div>
      </div>
    </div>
  );
};

export default Organizations;
