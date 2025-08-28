/* @source cursor @line_count 455 @branch main */
import { describe, test, expect } from 'vitest'
import { recursiveFieldSearch, recursiveFieldSearchAll } from '../common'

describe('recursiveFieldSearchAll', () => {
  // 测试数据
  const testData = {
    name: 'root-name',
    user: {
      name: 'user-name',
      profile: {
        name: 'profile-name',
        details: {
          firstName: 'John',
          lastName: 'Doe'
        }
      },
      settings: {
        name: 'settings-name',
        preferences: {
          theme: 'dark'
        }
      }
    },
    items: [
      { name: 'item-1', value: 100 },
      { name: 'item-2', value: 200 }
    ],
    config: {
      database: {
        name: 'db-name',
        host: 'localhost'
      }
    }
  }

  test('应该找到所有匹配的字段值和路径', () => {
    const results = recursiveFieldSearchAll(testData, 'name')
    
    // 函数会搜索数组内部的对象，所以包含items数组中的name字段
    expect(results).toHaveLength(7)
    
    // 验证包含的路径
    const paths = results.map(r => r.path)
    expect(paths).toContain('name')
    expect(paths).toContain('user.name')
    expect(paths).toContain('user.profile.name')
    expect(paths).toContain('user.settings.name')
    expect(paths).toContain('config.database.name')
    expect(paths).toContain('items.0.name')
    expect(paths).toContain('items.1.name')
    
    // 验证对应的值
    const nameValues = results.map(r => r.value)
    expect(nameValues).toContain('root-name')
    expect(nameValues).toContain('user-name')
    expect(nameValues).toContain('profile-name')
    expect(nameValues).toContain('settings-name')
    expect(nameValues).toContain('db-name')
    expect(nameValues).toContain('item-1')
    expect(nameValues).toContain('item-2')
  })

  test('应该处理不存在的字段', () => {
    const results = recursiveFieldSearchAll(testData, 'nonexistent')
    
    expect(results).toHaveLength(0)
    expect(results).toEqual([])
  })

  test('应该处理空数据', () => {
    const results = recursiveFieldSearchAll(null, 'name')
    expect(results).toEqual([])

    const results2 = recursiveFieldSearchAll(undefined, 'name')
    expect(results2).toEqual([])

    const results3 = recursiveFieldSearchAll({}, 'name')
    expect(results3).toEqual([])
  })

  test('应该处理空字段名', () => {
    const results = recursiveFieldSearchAll(testData, '')
    expect(results).toEqual([])

    const results2 = recursiveFieldSearchAll(testData, null as any)
    expect(results2).toEqual([])
  })

  test('应该处理嵌套路径字段', () => {
    const results = recursiveFieldSearchAll(testData, 'firstName')
    
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      value: 'John',
      path: 'user.profile.details.firstName'
    })
  })

  test('应该处理数组中的对象', () => {
    // 当前实现会搜索数组内部的对象，因为数组也是对象类型
    const arrayData = {
      items: [
        { name: 'item-1' },
        { name: 'item-2' }
      ]
    }
    
    const results = recursiveFieldSearchAll(arrayData, 'name')
    expect(results).toHaveLength(2) // 函数会搜索数组内部
    expect(results).toEqual([
      { value: 'item-1', path: 'items.0.name' },
      { value: 'item-2', path: 'items.1.name' }
    ])
  })

  test('应该防止循环引用', () => {
    const circularData: any = {
      name: 'root',
      child: {
        name: 'child'
      }
    }
    // 创建循环引用
    circularData.child.parent = circularData

    const results = recursiveFieldSearchAll(circularData, 'name')
    
    expect(results).toHaveLength(2)
    expect(results).toEqual([
      { value: 'root', path: 'name' },
      { value: 'child', path: 'child.name' }
    ])
  })

  test('应该处理深层嵌套', () => {
    const deepData = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                target: 'deep-value'
              }
            }
          }
        }
      }
    }

    const results = recursiveFieldSearchAll(deepData, 'target')
    
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      value: 'deep-value',
      path: 'level1.level2.level3.level4.level5.target'
    })
  })

  test('应该处理不同数据类型的值', () => {
    const mixedData = {
      stringValue: 'test',
      numberValue: 42,
      booleanValue: true,
      nullValue: null,
      undefinedValue: undefined,
      objectValue: { nested: 'value' },
      arrayValue: [1, 2, 3],
      nested: {
        stringValue: 'nested-test',
        numberValue: 99
      }
    }

    const stringResults = recursiveFieldSearchAll(mixedData, 'stringValue')
    expect(stringResults).toHaveLength(2)
    expect(stringResults).toEqual([
      { value: 'test', path: 'stringValue' },
      { value: 'nested-test', path: 'nested.stringValue' }
    ])

    const numberResults = recursiveFieldSearchAll(mixedData, 'numberValue')
    expect(numberResults).toHaveLength(2)
    expect(numberResults).toEqual([
      { value: 42, path: 'numberValue' },
      { value: 99, path: 'nested.numberValue' }
    ])

    const booleanResults = recursiveFieldSearchAll(mixedData, 'booleanValue')
    expect(booleanResults).toHaveLength(1)
    expect(booleanResults[0]).toEqual({
      value: true,
      path: 'booleanValue'
    })

    const nullResults = recursiveFieldSearchAll(mixedData, 'nullValue')
    expect(nullResults).toHaveLength(1)
    expect(nullResults[0]).toEqual({
      value: null,
      path: 'nullValue'
    })
  })

  test('应该正确处理对象的key为数字的情况', () => {
    const numericKeyData = {
      0: { name: 'first' },
      1: { name: 'second' },
      normal: { name: 'normal' }
    }

    const results = recursiveFieldSearchAll(numericKeyData, 'name')
    
    expect(results).toHaveLength(3)
    expect(results).toEqual([
      { value: 'first', path: '0.name' },
      { value: 'second', path: '1.name' },
      { value: 'normal', path: 'normal.name' }
    ])
  })

  test('应该处理复杂嵌套结构', () => {
    const complexData = {
      name: 'root',
      modules: {
        auth: {
          name: 'auth-module',
          config: {
            name: 'auth-config',
            providers: {
              google: {
                name: 'google-provider'
              },
              facebook: {
                name: 'facebook-provider'
              }
            }
          }
        },
        database: {
          name: 'db-module',
          connections: {
            primary: {
              name: 'primary-connection'
            }
          }
        }
      }
    }

    const results = recursiveFieldSearchAll(complexData, 'name')
    
    expect(results).toHaveLength(7)
    expect(results.map(r => r.path)).toEqual([
      'name',
      'modules.auth.name',
      'modules.auth.config.name',
      'modules.auth.config.providers.google.name',
      'modules.auth.config.providers.facebook.name',
      'modules.database.name',
      'modules.database.connections.primary.name'
    ])
  })

  test('应该处理包含特殊字符的字段名', () => {
    const specialData = {
      'field-with-dash': 'dash-value',
      'field_with_underscore': 'underscore-value',
      'field with space': 'space-value',
      nested: {
        'special-field': 'nested-special'
      }
    }

    const results1 = recursiveFieldSearchAll(specialData, 'field-with-dash')
    expect(results1).toHaveLength(1)
    expect(results1[0].path).toBe('field-with-dash')

    const results2 = recursiveFieldSearchAll(specialData, 'special-field')
    expect(results2).toHaveLength(1)
    expect(results2[0].path).toBe('nested.special-field')
  })

  test('性能测试：处理大型对象', () => {
    // 创建一个较大的测试对象
    const largeData: any = { name: 'root' }
    
    for (let i = 0; i < 100; i++) {
      largeData[`branch${i}`] = {
        name: `branch-${i}`,
        children: {}
      }
      
      for (let j = 0; j < 10; j++) {
        largeData[`branch${i}`].children[`child${j}`] = {
          name: `child-${i}-${j}`
        }
      }
    }

    const startTime = performance.now()
    const results = recursiveFieldSearchAll(largeData, 'name')
    const endTime = performance.now()

    expect(results).toHaveLength(1101) // 1 root + 100 branches + 1000 children
    expect(endTime - startTime).toBeLessThan(100) // 应该在100ms内完成
  })
})

describe('recursiveFieldSearch', () => {
  // 测试数据
  const testData = {
    name: 'root-name',
    user: {
      name: 'user-name',
      profile: {
        name: 'profile-name',
        details: {
          firstName: 'John',
          lastName: 'Doe'
        }
      }
    },
    config: {
      database: {
        name: 'db-name'
      }
    }
  }

  test('应该返回第一个匹配的字段值和路径', () => {
    const result = recursiveFieldSearch(testData, 'name')
    
    expect(result).not.toBeNull()
    expect(result).toEqual({
      value: 'root-name',
      path: 'name'
    })
  })

  test('应该处理不存在的字段', () => {
    const result = recursiveFieldSearch(testData, 'nonexistent')
    expect(result).toBeNull()
  })

  test('应该处理空数据', () => {
    expect(recursiveFieldSearch(null, 'name')).toBeNull()
    expect(recursiveFieldSearch(undefined, 'name')).toBeNull()
    expect(recursiveFieldSearch({}, 'name')).toBeNull()
  })

  test('应该处理空字段名', () => {
    expect(recursiveFieldSearch(testData, '')).toBeNull()
    expect(recursiveFieldSearch(testData, null as any)).toBeNull()
  })

  test('应该找到嵌套字段', () => {
    const result = recursiveFieldSearch(testData, 'firstName')
    
    expect(result).not.toBeNull()
    expect(result).toEqual({
      value: 'John',
      path: 'user.profile.details.firstName'
    })
  })

  test('应该返回第一个匹配项（不是所有匹配项）', () => {
    // 即使有多个同名字段，也只返回第一个找到的
    const result = recursiveFieldSearch(testData, 'name')
    
    expect(result).not.toBeNull()
    expect(result?.path).toBe('name') // 应该是根级别的name
    expect(result?.value).toBe('root-name')
  })

  test('应该防止循环引用', () => {
    const circularData: any = {
      name: 'root',
      child: {
        name: 'child'
      }
    }
    circularData.child.parent = circularData

    const result = recursiveFieldSearch(circularData, 'name')
    
    expect(result).not.toBeNull()
    expect(result).toEqual({
      value: 'root',
      path: 'name'
    })
  })

  test('应该处理深层嵌套结构', () => {
    const deepData = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                target: 'deep-value'
              }
            }
          }
        }
      }
    }

    const result = recursiveFieldSearch(deepData, 'target')
    
    expect(result).not.toBeNull()
    expect(result).toEqual({
      value: 'deep-value',
      path: 'level1.level2.level3.level4.level5.target'
    })
  })

  test('应该处理数组中的对象', () => {
    const arrayData = {
      items: [
        { name: 'item-1' },
        { name: 'item-2' }
      ]
    }
    
    const result = recursiveFieldSearch(arrayData, 'name')
    
    expect(result).not.toBeNull()
    expect(result).toEqual({
      value: 'item-1',
      path: 'items.0.name'
    })
  })

  test('应该处理不同数据类型的值', () => {
    const mixedData = {
      stringValue: 'test',
      numberValue: 42,
      booleanValue: true,
      nullValue: null,
      undefinedValue: undefined
    }

    const stringResult = recursiveFieldSearch(mixedData, 'stringValue')
    expect(stringResult?.value).toBe('test')

    const numberResult = recursiveFieldSearch(mixedData, 'numberValue')
    expect(numberResult?.value).toBe(42)

    const booleanResult = recursiveFieldSearch(mixedData, 'booleanValue')
    expect(booleanResult?.value).toBe(true)

    const nullResult = recursiveFieldSearch(mixedData, 'nullValue')
    expect(nullResult?.value).toBeNull()
  })
})
